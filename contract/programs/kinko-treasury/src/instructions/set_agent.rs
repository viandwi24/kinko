use anchor_lang::prelude::*;
use crate::state::UserTreasury;

#[derive(Accounts)]
pub struct SetAgent<'info> {
    #[account(
        mut,
        seeds = [b"treasury", owner.key().as_ref()],
        bump = treasury.bump,
        has_one = owner
    )]
    pub treasury: Account<'info, UserTreasury>,

    pub owner: Signer<'info>,
}

pub fn handle(context: Context<SetAgent>, agent: Pubkey) -> Result<()> {
    context.accounts.treasury.agent = agent;
    Ok(())
}
