use anchor_lang::prelude::*;
use crate::state::UserTreasury;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = owner,
        space = UserTreasury::DISCRIMINATOR.len() + UserTreasury::INIT_SPACE,
        seeds = [b"treasury", owner.key().as_ref()],
        bump
    )]
    pub treasury: Account<'info, UserTreasury>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle(context: Context<Initialize>) -> Result<()> {
    let treasury = &mut context.accounts.treasury;
    treasury.owner = context.accounts.owner.key();
    treasury.principal_lamports = 0;
    treasury.deposit_timestamp = Clock::get()?.unix_timestamp;
    treasury.total_yield_spent = 0;
    treasury.bump = context.bumps.treasury;
    Ok(())
}
