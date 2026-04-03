use anchor_lang::prelude::*;

/// Migrates an old-layout treasury account (with `agent` field) to the new layout.
/// Uses `UncheckedAccount` to bypass Anchor's discriminator check on the old account.
/// The instruction manually closes the account and returns rent to owner.
///
/// After calling this, the owner should call `initialize` + `deposit` to recreate.
#[derive(Accounts)]
pub struct MigrateTreasury<'info> {
    /// Old treasury account — unchecked so Anchor doesn't reject the old discriminator
    /// CHECK: We manually verify seeds and owner below
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

pub fn handle(context: Context<MigrateTreasury>) -> Result<()> {
    let treasury = &context.accounts.treasury;
    let owner = &context.accounts.owner;

    // Transfer all lamports from treasury to owner
    let lamports = treasury.lamports();
    **treasury.try_borrow_mut_lamports()? -= lamports;
    **owner.try_borrow_mut_lamports()? += lamports;

    // Zero out the account data so it's fully closed
    let mut data = treasury.try_borrow_mut_data()?;
    data.fill(0);

    Ok(())
}
