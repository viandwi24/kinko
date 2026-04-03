use anchor_lang::prelude::*;
use crate::state::UserTreasury;

const OLD_SIZE: usize = 8 + 32 + 8 + 8 + 8 + 1; // disc + owner + principal + ts + spent + bump = 65
const NEW_SIZE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 1; // + msol_amount = 73

/// Migrates a v1 treasury (65 bytes, no msol_amount) to v2 (73 bytes, msol_amount=0).
/// Resizes the account in-place — no lamports lost, no re-deposit needed.
/// Must be called before deposit_marinade can be used.
#[derive(Accounts)]
pub struct MigrateTreasuryV2<'info> {
    /// CHECK: UncheckedAccount — bypass discriminator check on old layout
    #[account(
        mut,
        seeds = [b"treasury", owner.key().as_ref()],
        bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle(context: Context<MigrateTreasuryV2>) -> Result<()> {
    let treasury_info = context.accounts.treasury.to_account_info();
    let data_len = treasury_info.data_len();

    // Only migrate if it's the old 65-byte layout
    if data_len == NEW_SIZE {
        msg!("Treasury already at v2 layout, nothing to do");
        return Ok(());
    }
    require!(data_len == OLD_SIZE, anchor_lang::error::ErrorCode::AccountDidNotDeserialize);

    // Read existing fields from old layout before realloc
    let (owner_bytes, principal, deposit_ts, yield_spent, bump) = {
        let data = treasury_info.try_borrow_data()?;
        // disc(8) + owner(32) + principal(8) + ts(8) + spent(8) + bump(1)
        let owner_bytes: [u8; 32] = data[8..40].try_into().unwrap();
        let principal   = u64::from_le_bytes(data[40..48].try_into().unwrap());
        let deposit_ts  = i64::from_le_bytes(data[48..56].try_into().unwrap());
        let yield_spent = u64::from_le_bytes(data[56..64].try_into().unwrap());
        let bump        = data[64];
        (owner_bytes, principal, deposit_ts, yield_spent, bump)
    };

    // Realloc to new size — payer covers extra rent
    let extra_rent = Rent::get()?.minimum_balance(NEW_SIZE) - Rent::get()?.minimum_balance(OLD_SIZE);
    if extra_rent > 0 {
        anchor_lang::solana_program::program::invoke(
            &anchor_lang::solana_program::system_instruction::transfer(
                context.accounts.owner.key,
                treasury_info.key,
                extra_rent,
            ),
            &[
                context.accounts.owner.to_account_info(),
                treasury_info.clone(),
                context.accounts.system_program.to_account_info(),
            ],
        )?;
    }
    treasury_info.realloc(NEW_SIZE, false)?;

    // Write new layout
    let mut data = treasury_info.try_borrow_mut_data()?;
    // discriminator stays at [0..8] — unchanged
    data[8..40].copy_from_slice(&owner_bytes);
    data[40..48].copy_from_slice(&principal.to_le_bytes());
    data[48..56].copy_from_slice(&deposit_ts.to_le_bytes());
    data[56..64].copy_from_slice(&yield_spent.to_le_bytes());
    data[64..72].copy_from_slice(&0u64.to_le_bytes()); // msol_amount = 0
    data[72] = bump;

    msg!("Treasury migrated: 65 -> 73 bytes, msol_amount=0");
    Ok(())
}
