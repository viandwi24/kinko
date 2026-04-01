# Phase 1 — Anchor Program: AgentTreasury (Per-User)

**Goal:** Setiap user punya Treasury PDA sendiri. SOL di-stake ke Marinade, principal terkunci, agent hanya bisa potong dari yield.

## Model

```
seeds = [b"treasury", user_wallet.key()]

Setiap user punya PDA sendiri:
  UserTreasury {
    owner: Pubkey,         // user wallet
    principal_msol: u64,   // mSOL terkunci (tidak bisa diambil)
    initial_sol_value: u64, // baseline saat deposit
    total_spent: u64,      // akumulasi yang sudah dipakai
    bump: u8,
  }
```

## Instructions

### `initialize()`
- Siapa: user
- Buat Treasury PDA untuk user tersebut

### `deposit(amount_sol: u64)`
- Siapa: user
- SOL → Marinade CPI → dapat mSOL → terkunci di PDA
- `principal_msol += mSOL received`
- `initial_sol_value += amount_sol`

### `deduct_yield(amount: u64)`
- Siapa: Agent A Asset Signer (via Executive delegation)
- Hitung available yield: `current_msol_value - initial_sol_value - total_spent`
- Revert jika `amount > available_yield`
- `total_spent += amount`
- Transfer mSOL ke Agent A operating wallet

### `get_available_yield()` — view
- Return: current mSOL value - initial - spent

## Checklist

- [ ] `UserTreasury` struct
- [ ] `initialize()` instruction
- [ ] `deposit()` + Marinade CPI
- [ ] `deduct_yield()` + yield check (hanya Agent A yang boleh panggil)
- [ ] Error codes: `InsufficientYield`, `Unauthorized`, `ZeroAmount`
- [ ] Tests:
  - [ ] Initialize PDA
  - [ ] Deposit → verify mSOL
  - [ ] deduct_yield() sukses jika cukup
  - [ ] deduct_yield() revert jika tidak cukup
  - [ ] deduct_yield() revert jika caller bukan Agent A
