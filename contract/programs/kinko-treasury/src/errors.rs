use anchor_lang::prelude::*;

#[error_code]
pub enum KinkoError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Insufficient yield — deposit more SOL or wait for yield to accrue")]
    InsufficientYield,
    #[msg("Unauthorized — signer is not the registered agent")]
    UnauthorizedAgent,
    #[msg("Invalid Marinade state account")]
    InvalidMarinadeState,
    #[msg("Invalid staking provider — use 0 for Simulated or 1 for Marinade")]
    InvalidStakingProvider,
    #[msg("Wrong deposit instruction for current staking provider")]
    WrongDepositInstruction,
    #[msg("Wrong deduct_yield instruction for current staking provider")]
    WrongDeductInstruction,
    #[msg("Treasury is paused by the owner")]
    TreasuryPaused,
    #[msg("Amount exceeds per-request cap set by the owner")]
    ExceedsPerRequestCap,
    #[msg("Amount exceeds daily spending limit set by the owner")]
    ExceedsDailyLimit,
}
