use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::UserTreasury;
use crate::errors::KinkoError;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"treasury", owner.key().as_ref()],
        bump = treasury.bump,
        has_one = owner
    )]
    pub treasury: Account<'info, UserTreasury>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle(context: Context<Deposit>, amount_lamports: u64) -> Result<()> {
    require!(amount_lamports > 0, KinkoError::ZeroAmount);

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

    // Preserve accrued yield when adding to principal:
    // After reset, new accrued starts at 0 — so we offset total_yield_spent
    // by the amount that was already available, making available_yield unchanged.
    let yield_before_deposit = treasury.available_yield(current_timestamp);
    treasury.principal_lamports = treasury.principal_lamports.saturating_add(amount_lamports);
    treasury.deposit_timestamp = current_timestamp;
    // new available_yield() = 0 (fresh clock), so to keep the same effective
    // available yield for the user we set total_yield_spent to negative offset
    treasury.total_yield_spent = 0_u64.saturating_sub(yield_before_deposit);

    Ok(())
}
