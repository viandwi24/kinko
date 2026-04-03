use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::UserTreasury;

/// Marinade Finance program ID.
const MARINADE_PROGRAM: Pubkey = pubkey!("MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD");

/// Liquid-unstake all mSOL back to owner, then close the treasury PDA.
/// All lamports (principal + rent + any accumulated yield) return to owner.
/// Uses Marinade liquid unstake — instant but ~0.3% fee.
#[derive(Accounts)]
pub struct WithdrawMarinade<'info> {
    #[account(
        mut,
        close = owner,
        seeds = [b"treasury", owner.key().as_ref()],
        bump = treasury.bump,
        has_one = owner,
    )]
    pub treasury: Account<'info, UserTreasury>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// mSOL mint — writable because liquid_unstake burns mSOL
    #[account(mut)]
    pub msol_mint: Account<'info, Mint>,

    /// Treasury's mSOL ATA — source of mSOL to unstake
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

    /// CHECK: Marinade treasury mSOL account (receives fee cut)
    #[account(mut)]
    pub treasury_msol_leg: UncheckedAccount<'info>,

    /// CHECK: Marinade program
    #[account(address = MARINADE_PROGRAM)]
    pub marinade_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handle(context: Context<WithdrawMarinade>) -> Result<()> {
    let msol_amount = context.accounts.treasury_msol_account.amount;

    // If there is mSOL, liquid-unstake it all back to owner
    if msol_amount > 0 {
        let unstake_ix_data: Vec<u8> = {
            let mut d = vec![30u8, 30, 119, 240, 191, 227, 12, 16];
            d.extend_from_slice(&msol_amount.to_le_bytes());
            d
        };

        let treasury_seeds: &[&[u8]] = &[
            b"treasury",
            context.accounts.owner.key.as_ref(),
            &[context.accounts.treasury.bump],
        ];

        let marinade_accounts = vec![
            AccountMeta::new(context.accounts.marinade_state.key(), false),
            AccountMeta::new(context.accounts.msol_mint.key(), false),
            AccountMeta::new(context.accounts.liq_pool_sol_leg_pda.key(), false),
            AccountMeta::new(context.accounts.liq_pool_msol_leg.key(), false),
            AccountMeta::new(context.accounts.treasury_msol_leg.key(), false),
            AccountMeta::new(context.accounts.treasury_msol_account.key(), false),
            AccountMeta::new(context.accounts.treasury.key(), true), // burn authority
            AccountMeta::new(context.accounts.owner.key(), false),   // receives SOL
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
                context.accounts.owner.to_account_info(),
                context.accounts.system_program.to_account_info(),
                context.accounts.token_program.to_account_info(),
            ],
            &[treasury_seeds],
        )?;
    }

    // `close = owner` in account constraint handles returning all remaining
    // lamports (rent) to owner automatically after this handler returns.
    Ok(())
}
