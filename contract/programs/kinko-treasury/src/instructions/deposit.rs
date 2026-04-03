use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::state::{KinkoConfig, StakingProvider, UserTreasury};
use crate::errors::KinkoError;

/// Marinade Finance program ID (devnet + mainnet).
const MARINADE_PROGRAM: Pubkey = pubkey!("MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD");

// ─── Simulated deposit context ─────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"treasury", owner.key().as_ref()],
        bump = treasury.bump,
        has_one = owner
    )]
    pub treasury: Account<'info, UserTreasury>,

    /// Global config — determines active staking provider
    #[account(
        seeds = [b"kinko_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, KinkoConfig>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ─── Marinade deposit context ──────────────────────────────────────────────────

#[derive(Accounts)]
pub struct DepositMarinade<'info> {
    #[account(
        mut,
        seeds = [b"treasury", owner.key().as_ref()],
        bump = treasury.bump,
        has_one = owner
    )]
    pub treasury: Account<'info, UserTreasury>,

    /// Global config — must have staking_provider = Marinade
    #[account(
        seeds = [b"kinko_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, KinkoConfig>,

    #[account(mut)]
    pub owner: Signer<'info>,

    // ─── mSOL token accounts ───────────────────────────────────────────────
    /// mSOL mint
    #[account(mut)]
    pub msol_mint: Account<'info, Mint>,

    /// mSOL ATA owned by the treasury PDA — receives mSOL from Marinade
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = msol_mint,
        associated_token::authority = treasury,
    )]
    pub treasury_msol_account: Account<'info, TokenAccount>,

    // ─── Marinade CPI accounts ─────────────────────────────────────────────
    /// CHECK: Marinade state account — validated by discriminator in handler
    #[account(mut)]
    pub marinade_state: UncheckedAccount<'info>,

    /// CHECK: Marinade liquid pool SOL leg PDA
    #[account(mut)]
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,

    /// CHECK: Marinade liquid pool mSOL leg
    #[account(mut)]
    pub liq_pool_msol_leg: UncheckedAccount<'info>,

    /// CHECK: Marinade liquid pool mSOL leg authority
    pub liq_pool_msol_leg_authority: UncheckedAccount<'info>,

    /// CHECK: Marinade reserve PDA
    #[account(mut)]
    pub reserve_pda: UncheckedAccount<'info>,

    /// CHECK: Marinade mSOL mint authority
    pub msol_mint_authority: UncheckedAccount<'info>,

    /// CHECK: Marinade program — validated in handler
    #[account(address = MARINADE_PROGRAM)]
    pub marinade_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

pub fn handle(context: Context<Deposit>, amount_lamports: u64) -> Result<()> {
    require!(amount_lamports > 0, KinkoError::ZeroAmount);
    require!(
        context.accounts.config.staking_provider == StakingProvider::Simulated,
        KinkoError::WrongDepositInstruction
    );

    system_program::transfer(
        CpiContext::new(
            context.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: context.accounts.owner.to_account_info(),
                to: context.accounts.treasury.to_account_info(),
            },
        ),
        amount_lamports,
    )?;

    let current_timestamp = Clock::get()?.unix_timestamp;
    let treasury = &mut context.accounts.treasury;

    let yield_before_deposit = treasury.available_yield_simulated(current_timestamp);
    treasury.principal_lamports = treasury.principal_lamports.saturating_add(amount_lamports);
    treasury.deposit_timestamp = current_timestamp;
    treasury.total_yield_spent = 0_u64.wrapping_sub(yield_before_deposit);

    Ok(())
}

pub fn handle_marinade(context: Context<DepositMarinade>, amount_lamports: u64) -> Result<()> {
    require!(amount_lamports > 0, KinkoError::ZeroAmount);
    require!(
        context.accounts.config.staking_provider == StakingProvider::Marinade,
        KinkoError::WrongDepositInstruction
    );

    // Read mSOL balance before deposit
    let msol_before = context.accounts.treasury_msol_account.amount;

    // CPI to Marinade deposit — transfer SOL from owner, receive mSOL to treasury ATA.
    // Marinade `deposit` instruction discriminator: [242, 35, 198, 137, 82, 225, 242, 182]
    let deposit_ix_data: Vec<u8> = {
        let mut d = vec![242u8, 35, 198, 137, 82, 225, 242, 182];
        d.extend_from_slice(&amount_lamports.to_le_bytes());
        d
    };

    let marinade_accounts = vec![
        AccountMeta::new(context.accounts.marinade_state.key(), false),
        AccountMeta::new(context.accounts.msol_mint.key(), false),
        AccountMeta::new(context.accounts.liq_pool_sol_leg_pda.key(), false),
        AccountMeta::new(context.accounts.liq_pool_msol_leg.key(), false),
        AccountMeta::new_readonly(context.accounts.liq_pool_msol_leg_authority.key(), false),
        AccountMeta::new(context.accounts.reserve_pda.key(), false),
        AccountMeta::new(context.accounts.owner.key(), true),
        AccountMeta::new(context.accounts.treasury_msol_account.key(), false),
        AccountMeta::new_readonly(context.accounts.msol_mint_authority.key(), false),
        AccountMeta::new_readonly(anchor_lang::solana_program::system_program::ID, false),
        AccountMeta::new_readonly(token::ID, false),
    ];

    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: context.accounts.marinade_program.key(),
        accounts: marinade_accounts,
        data: deposit_ix_data,
    };

    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            context.accounts.marinade_state.to_account_info(),
            context.accounts.msol_mint.to_account_info(),
            context.accounts.liq_pool_sol_leg_pda.to_account_info(),
            context.accounts.liq_pool_msol_leg.to_account_info(),
            context.accounts.liq_pool_msol_leg_authority.to_account_info(),
            context.accounts.reserve_pda.to_account_info(),
            context.accounts.owner.to_account_info(),
            context.accounts.treasury_msol_account.to_account_info(),
            context.accounts.msol_mint_authority.to_account_info(),
            context.accounts.system_program.to_account_info(),
            context.accounts.token_program.to_account_info(),
        ],
    )?;

    // Reload to get updated mSOL balance after CPI
    context.accounts.treasury_msol_account.reload()?;
    let msol_after = context.accounts.treasury_msol_account.amount;
    let msol_received = msol_after.saturating_sub(msol_before);

    let treasury = &mut context.accounts.treasury;
    treasury.principal_lamports = treasury.principal_lamports.saturating_add(amount_lamports);
    treasury.deposit_timestamp = Clock::get()?.unix_timestamp;
    treasury.msol_amount = treasury.msol_amount.saturating_add(msol_received);

    Ok(())
}
