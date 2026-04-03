# Memory

## No External File Paths

Semua config, keypair, dan secret harus lewat env var, bukan path ke sistem.
- Keypair → env var sebagai JSON byte array: `SERVER_AGENT_PRIVATE_KEY=[1,2,3,...]`
- File `~/.config/solana/id.json` atau path di luar repo **tidak boleh** di-hardcode

## Project Name

Project ini bernama **Kinko** (sebelumnya disebut AgentVault di docs/hk/idea.md).

## Monorepo Setup

Repo ini adalah **hybrid monorepo**:
- **TypeScript:** Bun workspaces via `package.json` → `apps/*`, `packages/*`
- **Rust/Anchor:** Cargo workspace via `Cargo.toml` → `programs/*`
- **Runtime:** Bun — selalu pakai `bun`, bukan `npm` atau `node`

## Hackathon Context

Project ini untuk hackathon **Trends.fun x Solana x402 — Metaplex Agents Track**.

## Token ($AGENT) — Post-MVP

Semua fitur terkait $AGENT token (buyback via Jupiter, token-gated access, Genesis Participant role, Metaplex Genesis mint) adalah **post-MVP**.
Jangan implement atau sebut sebelum MVP selesai dan end-to-end flow terbukti berjalan.

## Contract: Global Config PDA (tidak lagi per-treasury agent)

`deduct_yield` tidak lagi pakai `has_one = agent` di treasury. Agent pubkey disimpan di global `KinkoConfig` PDA (`seeds: [b"kinko_config"]`).

- Setelah deploy, operator **wajib** jalankan `bun run program-init-config` sekali
- User bisa deposit langsung tanpa perlu `set_agent` — tidak ada lagi step ini
- `set_agent` instruction sudah dihapus dari contract

## YIELD_RATE_BPS

Ada di dua tempat:
1. `contract/programs/kinko-treasury/src/state/user_treasury.rs` — source of truth onchain
2. `apps/server/src/services/treasury.ts` — `const YIELD_RATE_BPS = 800n` — hanya untuk pre-check display

Server pre-check tidak kritis (contract yang enforce), tapi kalau beda terlalu jauh bisa membingungkan user.

Toggle yield untuk testing: `bun run program-sim-yield on/off/status` — otomatis rebuild+deploy.

## Staking Provider

`KinkoConfig.staking_provider` field:
- `Simulated (0)`: yield via `YIELD_RATE_BPS = 800` formula. Default after `initialize_config`.
- `Marinade (1)`: SOL deposited to Marinade via CPI → mSOL held in treasury ATA. Yield = mSOL value - principal.

Switch: `bun run program-set-staking-provider marinade` / `simulated` / `status`

Marinade devnet addresses (docs.marinade.finance/developers/contract-addresses):
- Program: `MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD`
- mSOL mint: `mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So`
- State: `8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC` ← beda dari mainnet!
- liq_pool_sol_leg_pda: `UefNb6z6yvArqe4cJHTXCqStRsKmWhGxnZzuHbikP5Q`
- liq_pool_msol_leg: `7GgPYjS5Dza89wV6FpZ23kUJRG5vbQ1GM25ezspYFSoE`
- reserve_pda: `Du3Ysj1wKbxPKkuPPnvzQLQh8oMSVifs3jGZjJWXFmHN`
- treasury_msol_account: `8ZUcztoAEhpAeC2ixWewJKQJsSUGYSGPVAjkhDJYf5Gd`
- msol_mint_authority: `3JLPCS1qM2zRw3Dp6V4hZnYHd4toMNPkNesXdX9tg6KM`
- liq_pool_msol_leg_authority: PDA `[MARINADE_STATE, b"liq_st_sol_authority"]` dari Marinade program ← seeds include state pubkey!
- associated_token_program: `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` (v2, bukan `...e1brs` lama)

mSOL price in Marinade state (devnet): bytes 344–352 (numerator), 352–360 (denominator), LE u64.
NOTE: devnet offset berbeda dari mainnet (392/400). Verified empirically — ratio ~1.002 untuk devnet.

## Account Layout Versions

- **Layout lama (97 bytes):** disc(8) + owner(32) + agent(32) + principal(8) + ts(8) + spent(8) + bump(1)
- **Layout baru v1 (65 bytes):** disc(8) + owner(32) + principal(8) + ts(8) + spent(8) + bump(1)
- **Layout baru v2 (73 bytes):** disc(8) + owner(32) + principal(8) + ts(8) + spent(8) + msol(8) + bump(1) — current

Frontend auto-detect layout lama dan tampilkan banner migrate. Script operator: `bun run program-migrate-account`.
`migrate_treasury` instruction pakai `UncheckedAccount` — bypass Anchor discriminator check untuk close layout lama.

## Auth Flow

- **Human user:** SIWS → JWT (24h) → `Authorization: Bearer <token>` di semua chat request
- **Machine/A2A:** `X-Payment: <txSig>` → server verify tx onchain → serve
- Auto-login hanya di `/app/*` routes — landing page tidak trigger wallet popup
- JWT di-store di `localStorage` dengan key `kinko_auth`

## Chat Error Codes

- `treasury_not_found` (404) → user belum deposit, tampilkan instruksi deposit
- `insufficient_yield` (402) → yield kurang, tunggu atau deposit lebih
- `unauthorized` (401) → JWT expired, user perlu reconnect wallet

## Frontend Config dari Server

Web frontend hanya butuh: `NEXT_PUBLIC_AGENT_URL`. Semua info lain (programId, rpcUrl, agentAssetAddress, agentKeypairPubkey) di-fetch dari `GET /api/config`.

## Dynamic Metadata Routes

Semua JSON metadata dilayani sebagai dynamic server routes:
- `/.well-known/agent.json` — ERC-8004
- `/.well-known/metadata.json` — NFT/Metaplex standard
- `/.well-known/agent-card.json` — A2A
- `/agents/prices/...` — Kinko Prices sub-agent routes

## Anchor Program Devnet

Program `aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL` deployed di devnet.
KinkoConfig PDA: `C8YhkoqKoSjbXmFGhLXTNxZo5cD7ZcRE5uDVFhiBXHNj`.
Upgrade authority: `data/agent-keypair.json`.
Deploy: `bun run deploy:contract`.

## A2A Discovery

Primary: `KINKO_PRICES_ASSET_ADDRESS` env var → fetch agent-card.json langsung.
Secondary: Helius DAS `getAssetsByOwner` (butuh `HELIUS_API_KEY`).
Machine caller bayar via x402 (10,000 lamports per request ke Kinko Prices).

## Wallet Button

Pakai custom `WalletButton` component (`apps/web/components/wallet-button.tsx`) — bukan `WalletMultiButton` dari `@solana/wallet-adapter-react-ui`. Import dengan `dynamic` (ssr: false).
