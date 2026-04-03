# Current

## Phase
Per-user spending controls + V3 migration — deployed ✅

## Currently Working On
- Selesai. Semua fitur core + spending controls sudah berjalan.

## Relevant Files
- `contract/programs/kinko-treasury/src/state/user_treasury.rs` — V3 layout (106 bytes)
- `contract/programs/kinko-treasury/src/instructions/deduct_yield.rs` — enforces pause + caps
- `contract/programs/kinko-treasury/src/instructions/migrate_treasury_v3.rs` — V2→V3 in-place
- `contract/programs/kinko-treasury/src/instructions/set_user_settings.rs` — owner sets limits
- `contract/programs/kinko-treasury/src/instructions/set_paused.rs` — owner pause toggle
- `apps/server/src/services/treasury.ts` — dual-provider yield logic + V3 fields
- `apps/server/src/routes/config.ts` — /api/config + /api/config/admin/stats
- `apps/web/components/app/treasury-panel.tsx` — settings panel + V2/V3 migration banners
- `apps/web/components/dashboard/dashboard-shell.tsx` — admin stats section
- `apps/web/lib/api.ts` — TreasuryInfo + AdminStats types + fetchAdminStats

## Important Context
- **Program ID aktif:** `HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt` (devnet)
- **Config PDA:** `X6JGvxeCVxWRvTQ97ixoCmmmZRtYSf4DmtqKGLCNpoA`
- **Provider aktif:** Marinade
- **UserTreasury V3 layout:** 106 bytes — existing V2 (73 bytes) accounts need migrate_treasury_v3
- **V3 fields default:** max_per_request=0 (unlimited), daily_limit=0 (unlimited), is_paused=false
- **Daily limit window:** rolling 24h from `day_start_timestamp` — resets on first deduct after 24h
- **associated_token_program:** `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` (v2!)
- **mSOL price offset (devnet):** 344 (num), 352 (den)

## Next Up
- Deploy ke production: Vercel (web) + Railway/Fly.io (server)
- Test dengan wallet user lain (bukan agent keypair)
- Migrate existing V2 treasury ke V3 (banner muncul otomatis di frontend)
