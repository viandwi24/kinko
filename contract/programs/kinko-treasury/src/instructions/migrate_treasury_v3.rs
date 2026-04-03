use anchor_lang::prelude::*;

/// Migrate a V2 treasury (73 bytes) to V3 (106 bytes) in-place.
/// Adds 5 new fields with defaults: limits=0 (unlimited), is_paused=false.
/// Safe: no lamports lost, no re-deposit needed.
#[derive(Accounts)]
pub struct MigrateTreasuryV3<'info> {
    /// Treasury PDA — must be exactly 73 bytes (V2 layout, no space for new fields yet).
    /// We manually realloc before Anchor tries to deserialize with the new layout.
    /// CHECK: size validated in handler
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

const V2_SIZE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 1; // 73 bytes
const V3_SIZE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 1 + 8 + 8 + 8 + 8 + 1; // 106 bytes

pub fn handle(ctx: Context<MigrateTreasuryV3>) -> Result<()> {
    let account = &ctx.accounts.treasury;
    require!(
        account.data_len() == V2_SIZE,
        anchor_lang::error::ErrorCode::AccountDidNotDeserialize
    );

    // Realloc to V3 size, paying rent diff from owner
    let rent = Rent::get()?;
    let new_minimum = rent.minimum_balance(V3_SIZE);
    let current_lamports = account.lamports();
    if new_minimum > current_lamports {
        let diff = new_minimum - current_lamports;
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.owner.to_account_info(),
                    to: account.to_account_info(),
                },
            ),
            diff,
        )?;
    }

    account.realloc(V3_SIZE, false)?;

    // Zero out the 33 new bytes (offsets 73..106)
    let mut data = account.try_borrow_mut_data()?;
    for byte in &mut data[V2_SIZE..V3_SIZE] {
        *byte = 0;
    }

    Ok(())
}
