use anchor_lang::prelude::*;

pub const YIELD_RATE_BPS: u64 = 800; // 8.00% APY
pub const BPS_DENOMINATOR: u64 = 10_000;
pub const SECONDS_PER_YEAR: u64 = 365 * 24 * 60 * 60;

/// Per-user treasury PDA. Seeds: [b"treasury", owner.key()]
///
/// Principal is permanently locked — only yield can be spent.
/// Yield accrues at YIELD_RATE_BPS / BPS_DENOMINATOR per year
/// based on time elapsed since last deposit.
#[derive(InitSpace)]
#[account]
pub struct UserTreasury {
    pub owner: Pubkey,
    /// Agent A pubkey — the only account allowed to call deduct_yield
    pub agent: Pubkey,
    pub principal_lamports: u64,
    /// Unix timestamp of last deposit (yield clock resets on deposit)
    pub deposit_timestamp: i64,
    /// Cumulative yield already spent (lamports)
    pub total_yield_spent: u64,
    pub bump: u8,
}

impl UserTreasury {
    pub fn available_yield(&self, current_timestamp: i64) -> u64 {
        let elapsed_seconds = (current_timestamp - self.deposit_timestamp).max(0) as u64;
        let accrued = self
            .principal_lamports
            .saturating_mul(YIELD_RATE_BPS)
            .saturating_mul(elapsed_seconds)
            / BPS_DENOMINATOR
            / SECONDS_PER_YEAR;
        accrued.saturating_sub(self.total_yield_spent)
    }
}
