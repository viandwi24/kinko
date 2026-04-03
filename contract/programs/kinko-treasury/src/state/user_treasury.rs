use anchor_lang::prelude::*;

pub const YIELD_RATE_BPS: u64 = 800; // 8.00% APY
pub const BPS_DENOMINATOR: u64 = 10_000;
pub const SECONDS_PER_YEAR: u64 = 365 * 24 * 60 * 60;

/// Per-user treasury PDA. Seeds: [b"treasury", owner.key()]
///
/// Principal is permanently locked — only yield can be spent.
///
/// **Simulated mode:** Yield accrues at YIELD_RATE_BPS / BPS_DENOMINATOR per year.
/// **Marinade mode:** Yield = current mSOL value in SOL - principal_lamports.
///   mSOL is held in an ATA owned by this PDA. msol_amount tracks received tokens.
#[derive(InitSpace)]
#[account]
pub struct UserTreasury {
    pub owner: Pubkey,
    pub principal_lamports: u64,
    /// Unix timestamp of last deposit (yield clock resets on deposit for simulated mode)
    pub deposit_timestamp: i64,
    /// Cumulative yield already spent (lamports)
    pub total_yield_spent: u64,
    /// mSOL tokens received from Marinade on deposit (0 for simulated mode)
    pub msol_amount: u64,
    pub bump: u8,
    /// Per-request spending cap in lamports (0 = unlimited)
    pub max_per_request_lamports: u64,
    /// Daily spending limit in lamports (0 = unlimited)
    pub daily_limit_lamports: u64,
    /// Lamports already spent in current day window
    pub day_spent_lamports: u64,
    /// Unix timestamp when the current day window started
    pub day_start_timestamp: i64,
    /// If true, agent cannot deduct yield
    pub is_paused: bool,
}

impl UserTreasury {
    /// Simulated yield calculation (used when staking_provider = Simulated).
    pub fn available_yield_simulated(&self, current_timestamp: i64) -> u64 {
        let elapsed_seconds = (current_timestamp - self.deposit_timestamp).max(0) as u64;
        let accrued = self
            .principal_lamports
            .saturating_mul(YIELD_RATE_BPS)
            .saturating_mul(elapsed_seconds)
            / BPS_DENOMINATOR
            / SECONDS_PER_YEAR;
        accrued.saturating_sub(self.total_yield_spent)
    }

    /// Marinade yield calculation.
    /// msol_value_lamports = current lamport value of all held mSOL (from exchange rate).
    /// Yield = current value - principal (i.e. the appreciation).
    pub fn available_yield_marinade(&self, msol_value_lamports: u64) -> u64 {
        let gross = msol_value_lamports.saturating_sub(self.principal_lamports);
        gross.saturating_sub(self.total_yield_spent)
    }
}
