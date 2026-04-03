# Decisions

## ADR-001 — Global Config PDA untuk agent validation

**Context:** Awalnya `treasury.agent` field di setiap `UserTreasury` menyimpan agent pubkey. Setiap user baru harus memanggil `set_agent` secara manual (operator CLI) sebelum bisa chat — tidak scalable untuk public multi-user.

**Decision:** Hapus `treasury.agent` field. Tambah `KinkoConfig` global PDA (`seeds: [b"kinko_config"]`) yang menyimpan agent pubkey. `deduct_yield` memvalidasi agent dari config PDA ini. Operator panggil `initialize_config` sekali setelah deploy.

**Consequences:** User bisa deposit dan langsung chat tanpa step manual dari operator. Account layout berubah (97→65 bytes) — butuh migration untuk existing accounts. `migrate_treasury` instruction dibuat untuk handle ini.

## ADR-002 — SIWS (Sign-In With Solana) untuk multi-user auth

**Context:** Kinko adalah public multi-user app. Tanpa auth, siapapun bisa kirim `userWallet` orang lain di body request dan menguras yield orang lain.

**Decision:** Implement SIWS pattern — user sign pesan sekali saat connect wallet, server issue JWT (24h). Semua chat request pakai JWT. Machine caller (A2A/CLI) bypass JWT dengan `X-Payment: <txSig>` header.

**Consequences:** UX: popup wallet muncul sekali per 24 jam (saat login), tidak setiap chat. Machine caller tetap bisa akses tanpa JWT via x402 payment. Server extract wallet dari JWT — tidak percaya `userWallet` dari request body.

## ADR-003 — Kinko Prices sebagai sub-agent dalam satu server

**Context:** A2A membutuhkan minimal 2 agent. Membuat server terpisah lebih rumit untuk deployment dan testing.

**Decision:** Kinko Prices di-serve dari server yang sama pada path `/agents/prices/*`. Memiliki Core Asset sendiri, agent-card.json sendiri, dan x402 protection sendiri.

**Consequences:** Deployment lebih simpel (satu server). Kedua agent tetap punya Core Asset terpisah di devnet — judges bisa lihat dua onchain identities. Trade-off: tidak benar-benar "distributed" tapi cukup untuk demo hackathon.

## ADR-005 — Pluggable Staking Provider Architecture

**Context:** User requested real staking via Marinade Finance instead of simulated `YIELD_RATE_BPS` formula. Also wanted provider to be swappable in the future without a full contract rewrite.

**Decision:** `KinkoConfig` gets a `staking_provider: StakingProvider` enum field (u8, `Simulated=0`, `Marinade=1`). Contract has separate instruction pairs: `deposit`/`deposit_marinade`, `deduct_yield`/`deduct_yield_marinade`. Server reads `stakingProvider` from config and dispatches to the right instruction. New `set_staking_provider` instruction lets operator switch providers on-chain.

**Consequences:**
- Adding a new provider = new enum variant + new instruction pair + server dispatch case — no migration needed for contract or account data
- `UserTreasury` gains `msol_amount: u64` field (0 for simulated) → account size changes (65→73 bytes) → existing accounts need `migrate_treasury` again
- Marinade yield: computed from `msol_amount * exchange_rate - principal` instead of time-based formula
- `deduct_yield_marinade` does liquid unstake (instant SOL, ~0.3% fee) — no delayed unstake UX issue
- Operator switches provider via `bun run program-set-staking-provider marinade/simulated`
- **Default is Simulated** after `initialize_config` — no behavior change for existing deploy

## ADR-004 — Discovery A2A via env var + Helius DAS

**Context:** mpl-agent-registry SDK v0.2.4 punya bug dengan devnet program (registerIdentityV1 gagal). Discovery penuh via registry tidak bisa diandalkan.

**Decision:** Primary discovery: `KINKO_PRICES_ASSET_ADDRESS` env var (known agent). Secondary: Helius DAS `getAssetsByOwner` untuk broader discovery. Fallback ke general knowledge kalau tidak ada agent ditemukan.

**Consequences:** Robust untuk demo. Tidak butuh registry berfungsi sempurna. Mudah tambah agent baru dengan set env var.
