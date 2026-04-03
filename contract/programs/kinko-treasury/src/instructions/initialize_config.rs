use anchor_lang::prelude::*;
use crate::state::KinkoConfig;

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = KinkoConfig::DISCRIMINATOR.len() + KinkoConfig::INIT_SPACE,
        seeds = [b"kinko_config"],
        bump
    )]
    pub config: Account<'info, KinkoConfig>,

    /// The operator — must sign. Becomes config.authority.
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle(context: Context<InitializeConfig>, agent: Pubkey) -> Result<()> {
    let config = &mut context.accounts.config;
    config.authority = context.accounts.authority.key();
    config.agent = agent;
    config.bump = context.bumps.config;
    Ok(())
}
