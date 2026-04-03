use anchor_lang::prelude::*;
use crate::state::UserTreasury;

/// Set per-user spending limits.
/// Only callable by the treasury owner.
/// Pass 0 for either limit to disable it (unlimited).
#[derive(Accounts)]
pub struct SetUserSettings<'info> {
    #[account(
        mut,
        seeds = [b"treasury", owner.key().as_ref()],
        bump = treasury.bump,
        has_one = owner,
    )]
    pub treasury: Account<'info, UserTreasury>,

    pub owner: Signer<'info>,
}

pub fn handle(
    ctx: Context<SetUserSettings>,
    max_per_request_lamports: u64,
    daily_limit_lamports: u64,
) -> Result<()> {
    let treasury = &mut ctx.accounts.treasury;
    treasury.max_per_request_lamports = max_per_request_lamports;
    treasury.daily_limit_lamports = daily_limit_lamports;
    Ok(())
}
