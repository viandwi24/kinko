use anchor_lang::prelude::*;

/// Staking provider variant stored in KinkoConfig.
/// u8 discriminant — new variants can be added without migration.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum StakingProvider {
    /// Simulated yield — uses YIELD_RATE_BPS formula. Default.
    Simulated = 0,
    /// Marinade Finance — SOL is deposited via CPI, mSOL held in treasury ATA.
    Marinade = 1,
}

impl Default for StakingProvider {
    fn default() -> Self {
        StakingProvider::Simulated
    }
}

/// Marinade Finance program ID on devnet and mainnet.
pub const MARINADE_PROGRAM_ID: &str = "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD";

/// mSOL token mint — same on devnet and mainnet.
pub const MSOL_MINT: &str = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";

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
    /// Active staking provider (0=Simulated, 1=Marinade)
    pub staking_provider: StakingProvider,
    pub bump: u8,
}
