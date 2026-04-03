use anchor_lang::prelude::*;
use crate::state::UserTreasury;

/// Pause or unpause the treasury. Only callable by the treasury owner.
/// When paused, the agent cannot deduct yield.
#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(
        mut,
        seeds = [b"treasury", owner.key().as_ref()],
        bump = treasury.bump,
        has_one = owner,
    )]
    pub treasury: Account<'info, UserTreasury>,

    pub owner: Signer<'info>,
}

pub fn handle(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
    ctx.accounts.treasury.is_paused = paused;
    Ok(())
}
