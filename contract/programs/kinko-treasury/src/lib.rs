use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt");

#[program]
pub mod kinko_treasury {
    use super::*;

    /// Initialize global config (operator only, called once after deploy).
    /// Sets the agent pubkey and default staking provider (Simulated).
    pub fn initialize_config(context: Context<InitializeConfig>, agent: Pubkey) -> Result<()> {
        instructions::initialize_config::handle(context, agent)
    }

    /// Update the active staking provider (operator only).
    /// 0 = Simulated (YIELD_RATE_BPS formula), 1 = Marinade Finance CPI.
    pub fn set_staking_provider(context: Context<SetStakingProvider>, provider: u8) -> Result<()> {
        instructions::set_staking_provider::handle(context, provider)
    }

    /// Create a new per-user treasury PDA.
    pub fn initialize(context: Context<Initialize>) -> Result<()> {
        instructions::initialize::handle(context)
    }

    /// Deposit SOL into the treasury (Simulated provider).
    /// Principal is locked permanently; yield accrues via YIELD_RATE_BPS formula.
    pub fn deposit(context: Context<Deposit>, amount_lamports: u64) -> Result<()> {
        instructions::deposit::handle(context, amount_lamports)
    }

    /// Deposit SOL into the treasury via Marinade (Marinade provider).
    /// SOL is converted to mSOL and held in the treasury's ATA.
    /// Yield = current mSOL value - initial principal.
    pub fn deposit_marinade(context: Context<DepositMarinade>, amount_lamports: u64) -> Result<()> {
        instructions::deposit::handle_marinade(context, amount_lamports)
    }

    /// Deduct yield (Simulated provider). Only callable by the registered agent.
    pub fn deduct_yield(context: Context<DeductYield>, amount_lamports: u64) -> Result<()> {
        instructions::deduct_yield::handle(context, amount_lamports)
    }

    /// Deduct yield (Marinade provider). Liquid-unstakes mSOL to pay yield in SOL.
    pub fn deduct_yield_marinade(
        context: Context<DeductYieldMarinade>,
        amount_lamports: u64,
    ) -> Result<()> {
        instructions::deduct_yield::handle_marinade(context, amount_lamports)
    }

    /// Migrate v1 treasury (65 bytes) to v2 (73 bytes) in-place.
    /// Adds msol_amount=0 field. Must be called before deposit_marinade.
    /// Safe: no lamports lost, no re-deposit needed.
    pub fn migrate_treasury_v2(context: Context<MigrateTreasuryV2>) -> Result<()> {
        instructions::migrate_treasury_v2::handle(context)
    }

    /// Close the treasury PDA and return all lamports to the owner.
    pub fn close_treasury(context: Context<CloseTreasury>) -> Result<()> {
        instructions::close_treasury::handle(context)
    }

    /// Close the KinkoConfig PDA (authority only). Used when upgrading config layout.
    /// After closing, call initialize_config again with fresh layout.
    pub fn close_config(context: Context<CloseConfig>) -> Result<()> {
        instructions::close_config::handle(context)
    }

    /// Migrate old-layout treasury (with agent field) to new layout.
    /// Closes the old account and returns all lamports to owner.
    /// After this, call initialize + deposit to recreate.
    pub fn withdraw_marinade(context: Context<WithdrawMarinade>) -> Result<()> {
        instructions::withdraw_marinade::handle(context)
    }

    pub fn migrate_treasury(context: Context<MigrateTreasury>) -> Result<()> {
        instructions::migrate_treasury::handle(context)
    }

    /// Migrate a V2 treasury (73 bytes) to V3 (106 bytes) in-place.
    /// Adds per-request cap, daily limit, and pause fields.
    pub fn migrate_treasury_v3(context: Context<MigrateTreasuryV3>) -> Result<()> {
        instructions::migrate_treasury_v3::handle(context)
    }

    /// Set per-user spending limits (per-request cap and daily limit).
    /// Pass 0 to disable a limit. Only callable by the treasury owner.
    pub fn set_user_settings(
        context: Context<SetUserSettings>,
        max_per_request_lamports: u64,
        daily_limit_lamports: u64,
    ) -> Result<()> {
        instructions::set_user_settings::handle(context, max_per_request_lamports, daily_limit_lamports)
    }

    /// Pause or unpause the treasury. Only callable by the treasury owner.
    pub fn set_paused(context: Context<SetPaused>, paused: bool) -> Result<()> {
        instructions::set_paused::handle(context, paused)
    }
}
