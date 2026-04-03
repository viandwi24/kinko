use anchor_lang::prelude::*;
use crate::state::{UserTreasury, KinkoConfig};
use crate::errors::KinkoError;

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

pub fn handle(context: Context<DeductYield>, amount_lamports: u64) -> Result<()> {
    require!(amount_lamports > 0, KinkoError::ZeroAmount);
    require!(
        context.accounts.agent.key() == context.accounts.config.agent,
        KinkoError::UnauthorizedAgent
    );

    let current_timestamp = Clock::get()?.unix_timestamp;
    let available = context.accounts.treasury.available_yield(current_timestamp);
    require!(amount_lamports <= available, KinkoError::InsufficientYield);

    let treasury = &mut context.accounts.treasury;
    treasury.total_yield_spent = treasury.total_yield_spent.saturating_add(amount_lamports);

    treasury.sub_lamports(amount_lamports)?;
    context.accounts.recipient.add_lamports(amount_lamports)?;

    Ok(())
}
