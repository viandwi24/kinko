use anchor_lang::prelude::*;
use crate::state::UserTreasury;
use crate::errors::KinkoError;

#[derive(Accounts)]
pub struct DeductYield<'info> {
    #[account(
        mut,
        seeds = [b"treasury", treasury.owner.as_ref()],
        bump = treasury.bump,
        has_one = agent
    )]
    pub treasury: Account<'info, UserTreasury>,

    /// Agent A — only this signer can deduct yield
    pub agent: Signer<'info>,

    /// Receives the yield (agent operating wallet)
    #[account(mut)]
    pub recipient: SystemAccount<'info>,
}

pub fn handle(context: Context<DeductYield>, amount_lamports: u64) -> Result<()> {
    require!(amount_lamports > 0, KinkoError::ZeroAmount);

    let current_timestamp = Clock::get()?.unix_timestamp;
    let available = context.accounts.treasury.available_yield(current_timestamp);

    require!(amount_lamports <= available, KinkoError::InsufficientYield);

    let treasury = &mut context.accounts.treasury;
    treasury.total_yield_spent = treasury.total_yield_spent.saturating_add(amount_lamports);

    treasury.sub_lamports(amount_lamports)?;
    context.accounts.recipient.add_lamports(amount_lamports)?;

    Ok(())
}
