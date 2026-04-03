use anchor_lang::prelude::*;
use crate::state::UserTreasury;

#[derive(Accounts)]
pub struct CloseTreasury<'info> {
    #[account(
        mut,
        close = owner,
        seeds = [b"treasury", owner.key().as_ref()],
        bump = treasury.bump,
        has_one = owner
    )]
    pub treasury: Account<'info, UserTreasury>,

    /// Owner receives all lamports back (principal + rent)
    #[account(mut)]
    pub owner: Signer<'info>,
}

pub fn handle(_context: Context<CloseTreasury>) -> Result<()> {
    // `close = owner` in the account constraint handles the transfer automatically
    Ok(())
}