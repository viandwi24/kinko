# Changelog

## 2026-04-03 — Per-user spending controls + V3 migration + admin stats

### Contract
- New errors: `TreasuryPaused`, `ExceedsPerRequestCap`, `ExceedsDailyLimit`
- `UserTreasury` V3 layout (106 bytes): adds `max_per_request_lamports`, `daily_limit_lamports`, `day_spent_lamports`, `day_start_timestamp`, `is_paused`
- New instruction `migrate_treasury_v3`: in-place 73→106 bytes, zeroes new fields
- New instruction `set_user_settings`: owner sets per-tx cap + daily limit (0 = unlimited)
- New instruction `set_paused`: owner toggles pause kill-switch
- `deduct_yield` + `deduct_yield_marinade`: enforce pause, per-tx cap, rolling 24h daily limit

### Server
- `getTreasuryInfo` returns 4 new V3 fields: `maxPerRequestSol`, `dailyLimitSol`, `daySpentSol`, `isPaused`
- `/api/config/admin/stats`: aggregate across all treasury PDAs (totalAccounts, totalPrincipalSol, totalYieldSpentSol, pausedAccounts)

### Frontend
- V2 banner: "New features available — upgrade to unlock spending controls"
- Settings gear icon in treasury panel header (only when V3 and no migration needed)
- Settings panel: per-request cap input, daily limit input, Pause/Unpause button
- Dashboard admin stats section: 4 stat cards (vaults, principal, yield spent, paused)
- `handleDeposit` blocks V2 accounts too (shows V2 upgrade banner)
- V1→V3 chain migration (V1→V2 then V2→V3 in two txs)

### Files
- `contract/programs/kinko-treasury/src/errors.rs`
- `contract/programs/kinko-treasury/src/state/user_treasury.rs`
- `contract/programs/kinko-treasury/src/instructions/migrate_treasury_v3.rs` (new)
- `contract/programs/kinko-treasury/src/instructions/set_user_settings.rs` (new)
- `contract/programs/kinko-treasury/src/instructions/set_paused.rs` (new)
- `contract/programs/kinko-treasury/src/instructions/mod.rs`
- `contract/programs/kinko-treasury/src/instructions/deduct_yield.rs`
- `contract/programs/kinko-treasury/src/lib.rs`
- `apps/server/src/services/treasury.ts`
- `apps/server/src/routes/config.ts`
- `apps/web/lib/api.ts`
- `apps/web/components/app/treasury-panel.tsx`
- `apps/web/components/dashboard/dashboard-shell.tsx`

## 2026-04-03 — Marinade end-to-end fixes + withdraw + program-update-id

### Contract
- `deduct_yield_marinade`: fix `msol_mint` harus `#[account(mut)]` (writable privilege escalated error)
- `deduct_yield_marinade`: fix mSOL price offset 392→344, 400→352 (devnet Marinade state layout berbeda)
- New `withdraw_marinade` instruction: liquid-unstake semua mSOL ke owner + close treasury PDA sekaligus
- Redeploy ke address baru `HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt`

### Frontend
- Fix `ASSOCIATED_TOKEN_PROGRAM_ID` → v2 `...A8knL` (bukan `...e1brs` lama)
- Fix `LIQ_POOL_MSOL_LEG_AUTHORITY` seeds: `[MARINADE_STATE, b"liq_st_sol_authority"]`
- Tombol "Close & withdraw all SOL" dispatch `withdraw_marinade` jika provider Marinade, `close_treasury` jika Simulated
- Tombol "View treasury on Explorer" di panel treasury
- Banner migrate: V0 dan V1 tampilkan pesan berbeda, re-detect otomatis setelah V0→V1 selesai
- Guard di `handleDeposit`: blok jika akun V1, set banner otomatis

### Server
- Fix `getMsolAta`: pakai associated token program v2 `...A8knL`
- Fix mSOL price offset: 392→344, 400→352

### Scripts
- `scripts/program-update-id.ts`: sync program ID ke semua file setelah redeploy ke address baru

### Files
- `contract/programs/kinko-treasury/src/instructions/deduct_yield.rs`
- `contract/programs/kinko-treasury/src/instructions/withdraw_marinade.rs` (new)
- `contract/programs/kinko-treasury/src/instructions/mod.rs`
- `contract/programs/kinko-treasury/src/lib.rs`
- `apps/web/components/app/treasury-panel.tsx`
- `apps/server/src/services/treasury.ts`
- `scripts/program-update-id.ts` (new)
- `package.json`

## 2026-04-03 — Pluggable staking provider + Marinade Finance integration

### Contract
- `KinkoConfig` gains `staking_provider: StakingProvider` field (u8 enum: Simulated=0, Marinade=1)
- `UserTreasury` gains `msol_amount: u64` field (0 for simulated, mSOL tokens for Marinade)
- New instruction pair: `deposit_marinade` — CPI to Marinade to swap SOL→mSOL into treasury ATA
- New instruction pair: `deduct_yield_marinade` — liquid unstake mSOL→SOL via Marinade, pay agent
- New `set_staking_provider` instruction — operator switches provider on-chain
- Added `anchor-spl` dependency with `token`, `associated_token`, `idl-build` features
- Added error codes: `InvalidMarinadeState`, `InvalidStakingProvider`, `WrongDepositInstruction`, `WrongDeductInstruction`
- Account size changed: 65 → 73 bytes (existing accounts need migration again)

### Server
- `treasury.ts` refactored: reads `stakingProvider` from KinkoConfig, dispatches to correct instruction
- Marinade yield: fetches mSOL price from Marinade state account, computes `msol_value - principal`
- `parseMarinadeStateAddresses()` extracts pool accounts from state data (no Marinade SDK needed)
- `getTreasuryInfo` returns `stakingProvider: 'simulated' | 'marinade'` field

### Scripts
- `scripts/program-set-staking-provider.ts` — switch provider on-chain (`simulated`/`marinade`/`status`)
- Added `program-set-staking-provider` to root `package.json` scripts

### Files
- `contract/programs/kinko-treasury/src/state/kinko_config.rs`
- `contract/programs/kinko-treasury/src/state/user_treasury.rs`
- `contract/programs/kinko-treasury/src/instructions/deposit.rs`
- `contract/programs/kinko-treasury/src/instructions/deduct_yield.rs`
- `contract/programs/kinko-treasury/src/instructions/set_staking_provider.rs` (new)
- `contract/programs/kinko-treasury/src/instructions/mod.rs`
- `contract/programs/kinko-treasury/src/lib.rs`
- `contract/programs/kinko-treasury/src/errors.rs`
- `contract/programs/kinko-treasury/Cargo.toml`
- `apps/server/src/services/treasury.ts`
- `scripts/program-set-staking-provider.ts` (new)
- `package.json`



## 2026-04-03 — Security auth + contract global config refactor + account migration

### Auth: SIWS (Sign-In With Solana)
- `apps/server/src/routes/auth.ts` — nonce endpoint + login endpoint + JWT (HS256, 24h, manual impl tanpa library)
- `apps/web/contexts/auth-context.tsx` — AuthProvider: auto-login di /app/*, JWT di localStorage, auto-refresh, logout on disconnect
- `apps/web/components/auth-loading-overlay.tsx` — fullscreen overlay saat wallet sign
- Auth hanya trigger di `/app/*` — landing page tidak sign
- Chat `/api/chat` sekarang butuh `Authorization: Bearer <jwt>` (human) atau `X-Payment: <txSig>` (machine/A2A)

### Contract: Global Config PDA
- Hapus `treasury.agent` field dari `UserTreasury` struct
- Tambah `KinkoConfig` global PDA (`kinko_config` seeds) — menyimpan agent pubkey
- Tambah `initialize_config` instruction — dipanggil operator sekali setelah deploy
- Refactor `deduct_yield` — validasi agent dari `KinkoConfig` PDA, bukan `has_one = agent`
- Tambah `close_treasury` instruction — close account normal (layout baru)
- Tambah `migrate_treasury` instruction — close account layout lama (UncheckedAccount, bypass discriminator)
- Hapus `set_agent` instruction — tidak diperlukan lagi
- Deploy ulang ke devnet

### Account Migration
- `scripts/program-migrate-account.ts` — detect layout lama (97 bytes), panggil migrate_treasury, re-initialize, re-deposit principal
- Frontend `treasury-panel.tsx` — auto-detect account lama, tampilkan banner kuning + tombol migrate
- User bisa migrate langsung dari browser (wallet sign 2 tx)

### Frontend Polish
- `apps/web/components/wallet-button.tsx` — custom wallet button (bukan WalletMultiButton bawaan Solana)
- `apps/web/components/ui/dropdown-menu.tsx` — shadcn dropdown untuk wallet menu
- AppNav layout: `justify-between` → `grid-cols-3` (3 kolom equal width, nav benar-benar di center)
- Error messages di chat lebih informatif: treasury not found, insufficient yield, session expired
- `COST_PER_REQUEST_LAMPORTS` default turun ke `100_000` (0.0001 SOL)

### Scripts
- `scripts/program-init-config.ts` — init global KinkoConfig PDA (sekali setelah deploy)
- `scripts/program-sim-yield.ts` — toggle YIELD_RATE_BPS + auto rebuild+deploy (`on`/`off`/`status`)
- `scripts/program-migrate-account.ts` — migrate treasury layout lama untuk keypair operator
- Hapus `scripts/set-treasury-agent.ts` — obsolete
- Files: semua file di atas + `apps/server/src/routes/auth.ts`, `apps/server/src/routes/chat.ts`, `apps/server/src/services/treasury.ts`, `contract/programs/kinko-treasury/src/**`

## 2026-04-03 — A2A discovery via Metaplex registry

- Hapus `apps/agent-b/` dan `apps/setup-tui/` — tidak lagi relevan
- Rewrite `apps/server/src/services/a2a.ts`: discovery via Helius DAS API (`getAssetsByCreator`), fetch agent-card.json dari setiap asset, filter by skill, x402 probe→pay→retry
- Update `apps/server/src/services/llm.ts`: pakai `callSkillViaA2A(skill)` bukan hardcoded Agent B URL
- `SKILL_TRIGGERS` array di llm.ts — mudah tambah skill baru
- Hapus `AGENT_B_URL` dari .env dan .env.example, ganti dengan `HELIUS_API_KEY`
- Hapus `dev:agent-b` dari root package.json scripts
- Files: `apps/server/src/services/a2a.ts`, `apps/server/src/services/llm.ts`, `apps/server/.env.example`, `package.json`

## 2026-04-02 — End-to-end verified + polish

- Deployed Anchor program `kinko-treasury` ke devnet (`aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL`)
- Added `bun run deploy:contract` script ke root `package.json`
- Fixed `set_agent` — treasury.agent was Pubkey::default() after initialize; added `contract/scripts/set-treasury-agent.ts` + `bun run set-treasury-agent`
- Fixed YIELD_RATE_BPS sync bug — server was using 1_000_000 (test) while contract used 800; both back to 800 (8% APY)
- Lowered `COST_PER_REQUEST_LAMPORTS` to 1_000_000 (0.001 SOL)
- Dynamic `/.well-known/agent.json` — removed file dependency (`data/agent-metadata.json`), now fully from config
- `/.well-known/agent-card.json` — uses `config.agentName` instead of hardcoded 'Kinko'
- Added `config.frontendUrl` — `services.web` in agent.json now points to FRONTEND_URL
- Dashboard: added Smart Contract section (Program ID, Agent Asset, Network)
- Settings: split into 2 tabs — Agent (status, identity, Metaplex link) + Program (Anchor program, treasury, deposit estimator)
- Dashboard agent name now dynamic from `useAgentCard()` instead of hardcoded
- End-to-end flow verified: deposit SOL → yield accrues → chat deducts yield → tx hash confirmed onchain
- Files: `contract/programs/kinko-treasury/src/state/user_treasury.rs`, `apps/server/src/services/treasury.ts`, `apps/server/src/config.ts`, `apps/server/src/routes/agent-card.ts`, `apps/web/components/dashboard/dashboard-shell.tsx`, `apps/web/components/settings/settings-shell.tsx`, `package.json`

## 2026-04-02 — Rename: agent-a → server, packages/web → apps/web

- Renamed `apps/agent-a/` → `apps/server/` (package name `@kinko/server`)
- Moved `packages/web/` → `apps/web/` (package name `@kinko/web`)
- Updated root `package.json` scripts: `dev:agent-a` → `dev:server`, paths updated
- Files: `package.json`, `apps/server/package.json`, `apps/web/package.json`

## 2026-04-02 — Phase 4 + 5: Frontend Dashboard + Agent B A2A

- Solana wallet adapter (Phantom + Solflare) in `components/wallet-provider.tsx`
- `hooks/use-treasury.ts` — TanStack Query, reads treasury via server API
- `hooks/use-agent.ts` — agent health + agent card queries
- `lib/api.ts` — typed API client
- `/app` page: treasury panel + chat panel
- `/dashboard` page: agent stats, status badge, endpoints reference
- Added shadcn: card, input, skeleton, scroll-area, textarea, sonner
- Files: `apps/web/lib/api.ts`, `apps/web/hooks/*`, `apps/web/components/app/*`, `apps/web/components/dashboard/*`

## 2026-04-02 — Phase 3: Agent A Runtime

- `apps/server/src/config.ts` — env-based config, keypair via AGENT_PRIVATE_KEY JSON byte array
- `apps/server/src/services/treasury.ts` — getTreasuryInfo + checkAndDeductYield
- `apps/server/src/services/attributes.ts` — updateAgentStats via Umi + mpl-core
- `apps/server/src/routes/chat.ts` — deduct yield → LLM → update attributes
- Files: `apps/server/src/config.ts`, `apps/server/src/services/treasury.ts`, `apps/server/src/services/attributes.ts`, `apps/server/src/routes/chat.ts`

## 2026-04-02 — Phase 2: Agent Identity + Web Redesign

- Created `packages/solana/` (`@kinko/solana`) package
- Agent Core Asset setup scripts
- Redesigned web UI: dark purple theme
- Files: `packages/solana/src/**`, `apps/web/app/globals.css`, `apps/web/components/landing/*.tsx`

## 2026-04-01 — Bootstrap: Automated Docs Setup

- Created `CLAUDE.md`, `docs/product_spec.md`, `docs/architecture.md`, all `docs/builder/` files
