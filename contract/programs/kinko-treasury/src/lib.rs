use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL");

#[program]
pub mod kinko_treasury {
    use super::*;

    /// Create a new per-user treasury PDA.
    pub fn initialize(context: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(context)
    }

    /// Deposit SOL into the treasury. Principal is locked permanently.
    pub fn deposit(context: Context<Deposit>, amount_lamports: u64) -> Result<()> {
        instructions::deposit::handler(context, amount_lamports)
    }

    /// Only callable by the registered agent. Deducts yield to pay for AI service.
    pub fn deduct_yield(context: Context<DeductYield>, amount_lamports: u64) -> Result<()> {
        instructions::deduct_yield::handler(context, amount_lamports)
    }

    /// Owner registers which agent pubkey is allowed to call deduct_yield.
    pub fn set_agent(context: Context<SetAgent>, agent: Pubkey) -> Result<()> {
        instructions::set_agent::handler(context, agent)
    }
}
