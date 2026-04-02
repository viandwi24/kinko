use anchor_lang::prelude::*;

#[error_code]
pub enum KinkoError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Insufficient yield — deposit more SOL or wait for yield to accrue")]
    InsufficientYield,
}
