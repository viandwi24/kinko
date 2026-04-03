use anchor_lang::prelude::*;
use crate::state::{KinkoConfig, StakingProvider};
use crate::errors::KinkoError;

#[derive(Accounts)]
pub struct SetStakingProvider<'info> {
    #[account(
        mut,
        seeds = [b"kinko_config"],
        bump = config.bump,
        has_one = authority @ KinkoError::UnauthorizedAgent,
    )]
    pub config: Account<'info, KinkoConfig>,

    /// Must be the original authority (operator)
    pub authority: Signer<'info>,
}

pub fn handle(context: Context<SetStakingProvider>, provider: u8) -> Result<()> {
    let staking_provider = match provider {
        0 => StakingProvider::Simulated,
        1 => StakingProvider::Marinade,
        _ => return Err(KinkoError::InvalidStakingProvider.into()),
    };
    context.accounts.config.staking_provider = staking_provider;
    Ok(())
}
