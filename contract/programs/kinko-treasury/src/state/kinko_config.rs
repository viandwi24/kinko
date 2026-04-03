use anchor_lang::prelude::*;

/// Global config PDA — seeds: [b"kinko_config"]
/// Initialized once by operator after deploy.
/// Stores the agent pubkey allowed to call deduct_yield on any treasury.
#[derive(InitSpace)]
#[account]
pub struct KinkoConfig {
    /// The operator who initialized this config
    pub authority: Pubkey,
    /// The agent keypair pubkey — only this signer can call deduct_yield
    pub agent: Pubkey,
    pub bump: u8,
}
