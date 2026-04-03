use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL");

#[program]
pub mod kinko_treasury {
    use super::*;

    /// Initialize global config (operator only, called once after deploy).
    /// Sets the agent pubkey allowed to call deduct_yield on any treasury.
    pub fn initialize_config(context: Context<InitializeConfig>, agent: Pubkey) -> Result<()> {
        instructions::initialize_config::handle(context, agent)
    }

    /// Create a new per-user treasury PDA.
    pub fn initialize(context: Context<Initialize>) -> Result<()> {
        instructions::initialize::handle(context)
    }

    /// Deposit SOL into the treasury. Principal is locked permanently.
    pub fn deposit(context: Context<Deposit>, amount_lamports: u64) -> Result<()> {
        instructions::deposit::handle(context, amount_lamports)
    }

    /// Only callable by the registered agent (from global config). Deducts yield to pay for AI service.
    pub fn deduct_yield(context: Context<DeductYield>, amount_lamports: u64) -> Result<()> {
        instructions::deduct_yield::handle(context, amount_lamports)
    }

    /// Close the treasury PDA and return all lamports to the owner.
    pub fn close_treasury(context: Context<CloseTreasury>) -> Result<()> {
        instructions::close_treasury::handle(context)
    }

    /// Migrate old-layout treasury (with agent field) to new layout.
    /// Closes the old account and returns all lamports to owner.
    /// After this, call initialize + deposit to recreate.
    pub fn migrate_treasury(context: Context<MigrateTreasury>) -> Result<()> {
        instructions::migrate_treasury::handle(context)
    }
}
