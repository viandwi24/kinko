use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{KinkoConfig, StakingProvider, UserTreasury};
use crate::errors::KinkoError;

/// Marinade Finance program ID (devnet + mainnet).
const MARINADE_PROGRAM: Pubkey = pubkey!("MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD");

// ─── Simulated deduct context ──────────────────────────────────────────────────

#[derive(Accounts)]
pub struct DeductYield<'info> {
    #[account(
        mut,
        seeds = [b"treasury", treasury.owner.as_ref()],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, UserTreasury>,

    /// Global config — agent pubkey is validated here
    #[account(
        seeds = [b"kinko_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, KinkoConfig>,

    /// Must match config.agent
    pub agent: Signer<'info>,

    /// Receives the yield (agent operating wallet)
    #[account(mut)]
    pub recipient: SystemAccount<'info>,
}

// ─── Marinade deduct context ───────────────────────────────────────────────────

#[derive(Accounts)]
pub struct DeductYieldMarinade<'info> {
    #[account(
        mut,
        seeds = [b"treasury", treasury.owner.as_ref()],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, UserTreasury>,

    /// Global config — agent pubkey + Marinade provider validated here
    #[account(
        seeds = [b"kinko_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, KinkoConfig>,

    /// Must match config.agent
    pub agent: Signer<'info>,

    /// Receives the yield in SOL (agent operating wallet)
    #[account(mut)]
    pub recipient: SystemAccount<'info>,

    /// mSOL mint — must be writable because liquid_unstake burns mSOL
    #[account(mut)]
    pub msol_mint: Account<'info, Mint>,

    /// Treasury's mSOL ATA — we'll unstake from here if needed
    #[account(
        mut,
        associated_token::mint = msol_mint,
        associated_token::authority = treasury,
    )]
    pub treasury_msol_account: Account<'info, TokenAccount>,

    // ─── Marinade liquid unstake accounts ──────────────────────────────────
    /// CHECK: Marinade state account
    #[account(mut)]
    pub marinade_state: UncheckedAccount<'info>,

    /// CHECK: Marinade liquid pool SOL leg PDA
    #[account(mut)]
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,

    /// CHECK: Marinade liquid pool mSOL leg
    #[account(mut)]
    pub liq_pool_msol_leg: UncheckedAccount<'info>,

    /// CHECK: Marinade treasury msol account
    #[account(mut)]
    pub treasury_msol_leg: UncheckedAccount<'info>,

    /// CHECK: Marinade program — validated in handler
    #[account(address = MARINADE_PROGRAM)]
    pub marinade_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

pub fn handle(context: Context<DeductYield>, amount_lamports: u64) -> Result<()> {
    require!(amount_lamports > 0, KinkoError::ZeroAmount);
    require!(
        context.accounts.config.staking_provider == StakingProvider::Simulated,
        KinkoError::WrongDeductInstruction
    );
    require!(
        context.accounts.agent.key() == context.accounts.config.agent,
        KinkoError::UnauthorizedAgent
    );

    let current_timestamp = Clock::get()?.unix_timestamp;
    let available = context.accounts.treasury.available_yield_simulated(current_timestamp);
    require!(amount_lamports <= available, KinkoError::InsufficientYield);

    let treasury = &mut context.accounts.treasury;

    // V3 spending controls
    require!(!treasury.is_paused, KinkoError::TreasuryPaused);
    if treasury.max_per_request_lamports > 0 {
        require!(
            amount_lamports <= treasury.max_per_request_lamports,
            KinkoError::ExceedsPerRequestCap
        );
    }
    if treasury.daily_limit_lamports > 0 {
        // Reset window if 24h has elapsed
        if current_timestamp - treasury.day_start_timestamp >= 86_400 {
            treasury.day_spent_lamports = 0;
            treasury.day_start_timestamp = current_timestamp;
        }
        require!(
            treasury.day_spent_lamports.saturating_add(amount_lamports) <= treasury.daily_limit_lamports,
            KinkoError::ExceedsDailyLimit
        );
        treasury.day_spent_lamports = treasury.day_spent_lamports.saturating_add(amount_lamports);
    }

    treasury.total_yield_spent = treasury.total_yield_spent.saturating_add(amount_lamports);

    treasury.sub_lamports(amount_lamports)?;
    context.accounts.recipient.add_lamports(amount_lamports)?;

    Ok(())
}

pub fn handle_marinade(
    context: Context<DeductYieldMarinade>,
    amount_lamports: u64,
) -> Result<()> {
    require!(amount_lamports > 0, KinkoError::ZeroAmount);
    require!(
        context.accounts.config.staking_provider == StakingProvider::Marinade,
        KinkoError::WrongDeductInstruction
    );
    require!(
        context.accounts.agent.key() == context.accounts.config.agent,
        KinkoError::UnauthorizedAgent
    );

    // Compute current mSOL value in lamports from Marinade state exchange rate.
    // msol_price in Marinade state = [num, den] — value of 1 mSOL in lamports = num/den * 0.001
    // Actual formula: lamports_value = msol_amount * msol_price_num / msol_price_den
    let msol_price = parse_msol_price_from_state(&context.accounts.marinade_state)?;
    let msol_amount = context.accounts.treasury.msol_amount;
    let msol_value_lamports = (msol_amount as u128)
        .checked_mul(msol_price.0 as u128)
        .unwrap_or(0)
        .checked_div(msol_price.1 as u128)
        .unwrap_or(0) as u64;

    let available = context
        .accounts
        .treasury
        .available_yield_marinade(msol_value_lamports);
    require!(amount_lamports <= available, KinkoError::InsufficientYield);

    // V3 spending controls
    {
        let treasury = &mut context.accounts.treasury;
        require!(!treasury.is_paused, KinkoError::TreasuryPaused);
        if treasury.max_per_request_lamports > 0 {
            require!(
                amount_lamports <= treasury.max_per_request_lamports,
                KinkoError::ExceedsPerRequestCap
            );
        }
        if treasury.daily_limit_lamports > 0 {
            let now = Clock::get()?.unix_timestamp;
            if now - treasury.day_start_timestamp >= 86_400 {
                treasury.day_spent_lamports = 0;
                treasury.day_start_timestamp = now;
            }
            require!(
                treasury.day_spent_lamports.saturating_add(amount_lamports) <= treasury.daily_limit_lamports,
                KinkoError::ExceedsDailyLimit
            );
            treasury.day_spent_lamports = treasury.day_spent_lamports.saturating_add(amount_lamports);
        }
    }

    // Liquid unstake via Marinade: burn mSOL → receive SOL instantly (minus 0.3% fee)
    // Amount of mSOL to unstake = amount_lamports * msol_price_den / msol_price_num
    let msol_to_burn = (amount_lamports as u128)
        .checked_mul(msol_price.1 as u128)
        .unwrap_or(0)
        .checked_div(msol_price.0 as u128)
        .unwrap_or(0) as u64;

    require!(msol_to_burn > 0, KinkoError::ZeroAmount);
    require!(msol_to_burn <= msol_amount, KinkoError::InsufficientYield);

    // CPI to Marinade liquid_unstake
    // Instruction discriminator for liquid_unstake: [30, 30, 119, 240, 191, 227, 12, 16]
    let unstake_ix_data: Vec<u8> = {
        let mut d = vec![30u8, 30, 119, 240, 191, 227, 12, 16];
        d.extend_from_slice(&msol_to_burn.to_le_bytes());
        d
    };

    let treasury_seeds: &[&[u8]] = &[
        b"treasury",
        context.accounts.treasury.owner.as_ref(),
        &[context.accounts.treasury.bump],
    ];

    let marinade_accounts = vec![
        AccountMeta::new(context.accounts.marinade_state.key(), false),
        AccountMeta::new(context.accounts.msol_mint.key(), false),
        AccountMeta::new(context.accounts.liq_pool_sol_leg_pda.key(), false),
        AccountMeta::new(context.accounts.liq_pool_msol_leg.key(), false),
        AccountMeta::new(context.accounts.treasury_msol_leg.key(), false),
        AccountMeta::new(context.accounts.treasury_msol_account.key(), false),
        AccountMeta::new(context.accounts.treasury.key(), true), // burn authority (treasury PDA)
        AccountMeta::new(context.accounts.recipient.key(), false), // receives SOL
        AccountMeta::new_readonly(anchor_lang::solana_program::system_program::ID, false),
        AccountMeta::new_readonly(anchor_spl::token::ID, false),
    ];

    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: context.accounts.marinade_program.key(),
        accounts: marinade_accounts,
        data: unstake_ix_data,
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            context.accounts.marinade_state.to_account_info(),
            context.accounts.msol_mint.to_account_info(),
            context.accounts.liq_pool_sol_leg_pda.to_account_info(),
            context.accounts.liq_pool_msol_leg.to_account_info(),
            context.accounts.treasury_msol_leg.to_account_info(),
            context.accounts.treasury_msol_account.to_account_info(),
            context.accounts.treasury.to_account_info(),
            context.accounts.recipient.to_account_info(),
            context.accounts.system_program.to_account_info(),
            context.accounts.token_program.to_account_info(),
        ],
        &[treasury_seeds],
    )?;

    let treasury = &mut context.accounts.treasury;
    treasury.msol_amount = treasury.msol_amount.saturating_sub(msol_to_burn);
    treasury.total_yield_spent = treasury.total_yield_spent.saturating_add(amount_lamports);

    Ok(())
}

/// Parse mSOL price (numerator, denominator) from Marinade state account.
/// Returns (price_num, price_den) where 1 mSOL = price_num/price_den lamports.
fn parse_msol_price_from_state(marinade_state: &AccountInfo) -> Result<(u64, u64)> {
    let data = marinade_state.try_borrow_data()?;
    // devnet Marinade state: msol_price at offset 344 (num) and 352 (den)
    // verified empirically — ratio ≈ 1.002 on devnet
    require!(data.len() >= 360, KinkoError::InvalidMarinadeState);
    let num = u64::from_le_bytes(data[344..352].try_into().unwrap());
    let den = u64::from_le_bytes(data[352..360].try_into().unwrap());
    require!(den > 0, KinkoError::InvalidMarinadeState);
    Ok((num, den))
}
