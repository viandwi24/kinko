use anchor_lang::prelude::*;
use crate::state::KinkoConfig;
use crate::errors::KinkoError;

/// Close the KinkoConfig PDA. Used when upgrading config layout.
/// Only callable by the original authority.
/// After closing, call initialize_config again to recreate with new layout.
#[derive(Accounts)]
pub struct CloseConfig<'info> {
    /// CHECK: We close this account manually to handle old layouts
    #[account(
        mut,
        seeds = [b"kinko_config"],
        bump,
    )]
    pub config: UncheckedAccount<'info>,

    /// Must be the authority stored at byte offset 8 (after discriminator) in config data.
    /// We read it raw because the old layout may not match the current struct.
    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn handle(context: Context<CloseConfig>) -> Result<()> {
    let config_info = context.accounts.config.to_account_info();
    let data = config_info.try_borrow_data()?;

    // Authority pubkey starts at offset 8 (after 8-byte discriminator)
    require!(data.len() >= 40, KinkoError::UnauthorizedAgent);
    let authority_bytes: [u8; 32] = data[8..40].try_into().map_err(|_| KinkoError::UnauthorizedAgent)?;
    let stored_authority = Pubkey::from(authority_bytes);
    drop(data);

    require!(
        context.accounts.authority.key() == stored_authority,
        KinkoError::UnauthorizedAgent
    );

    // Transfer all lamports to authority and zero out data
    let lamports = config_info.lamports();
    **config_info.try_borrow_mut_lamports()? = 0;
    **context.accounts.authority.try_borrow_mut_lamports()? += lamports;

    // Zero the data
    let mut data = config_info.try_borrow_mut_data()?;
    for byte in data.iter_mut() {
        *byte = 0;
    }

    Ok(())
}
