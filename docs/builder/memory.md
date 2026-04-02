# Memory

## No External File Paths

**Jangan pernah keluar dari folder utama project.** Semua config, keypair, dan secret harus lewat env var, bukan path ke sistem (`~/.config/solana/id.json`, dll).

- Keypair → env var sebagai JSON byte array string: `OPERATOR_PRIVATE_KEY=[1,2,3,...]`
- Cara dapat: `cat <keypair.json> | tr -d '\n'` lalu paste ke `.env`
- File `~/.config/solana/id.json` atau path di luar repo **tidak boleh** di-hardcode sebagai default

## Project Name

Project ini bernama **Kinko** (sebelumnya disebut AgentVault di docs/hk/idea.md).

## Monorepo Setup

Repo ini adalah **hybrid monorepo**:
- **TypeScript:** Bun workspaces via `package.json` → `apps/*`, `packages/*`
- **Rust/Anchor:** Cargo workspace via `Cargo.toml` → `programs/*`
- **Runtime:** Bun (bukan Node.js/npm) — selalu pakai `bun`, bukan `npm` atau `node`
- Anchor version: `0.31.x`, workspace dependency di-share dari root `Cargo.toml`

## Hackathon Context

Project ini untuk hackathon **Trends.fun x Solana x402 — Metaplex Agents Track**.
Scoring bergantung pada kedalaman integrasi Metaplex — semakin dalam = semakin tinggi skor.

## MVP 3 Core Loops

Fokus pada 3 loop ini dulu, score boosters hanya setelah core selesai:
1. **Loop 1** — Agent Identity (Core Asset + Attributes + Registry)
2. **Loop 2** — A2A + x402 Payment Flow (dua agent, dua transaksi verifiable)
3. **Loop 3** — Token Economy (Genesis + buyback + metrics update)

## Agent B

Agent B bukan fitur produk — dia adalah **saksi A2A yang terverifikasi onchain**. Judges perlu lihat dua Core Asset berbeda, dua wallet berbeda, dua transaksi berbeda.

## YIELD_RATE_BPS Harus Sinkron

`YIELD_RATE_BPS` ada di DUA tempat dan harus selalu sama nilainya:
1. `contract/programs/kinko-treasury/src/state/user_treasury.rs` — dipakai onchain di `deduct_yield`
2. `apps/server/src/services/treasury.ts` — dipakai server untuk pre-check sebelum kirim tx

Kalau beda, server akan bilang "cukup yield" tapi contract reject dengan `InsufficientYield`.
Current value: `800` (8% APY).

## set_agent Wajib Dipanggil Setelah Initialize Treasury

`initialize` di contract set `treasury.agent = Pubkey::default()`. `deduct_yield` punya constraint `has_one = agent` — kalau agent belum di-set, semua chat request gagal dengan `ConstraintHasOne`.

Jalankan: `bun run set-treasury-agent` setelah user pertama kali deposit.
Script ada di: `contract/scripts/set-treasury-agent.ts` (harus dari contract/ dir agar resolve @coral-xyz/anchor).

## Anchor Module Resolution

Script yang import `@coral-xyz/anchor` harus ada di dalam `contract/` atau dijalankan dengan CWD `contract/` — Bun resolve dari lokasi file, bukan CWD. Script di root `scripts/` yang butuh anchor tidak bisa resolve modulnya dari sana.

## Frontend Config dari Server

Web frontend hanya butuh satu env var: `NEXT_PUBLIC_AGENT_URL`. Semua info lain (programId, rpcUrl, agentAssetAddress) di-fetch dari `GET /api/config`. Tidak ada `NEXT_PUBLIC_ANCHOR_PROGRAM_ID` atau sejenisnya di web.

## Dynamic Metadata Routes

Semua JSON metadata dilayani sebagai dynamic server routes — tidak ada file JSON yang ditulis ke disk:
- `/.well-known/agent.json` — ERC-8004, dari config
- `/.well-known/metadata.json` — NFT/Metaplex standard, dari env
- `/.well-known/agent-card.json` — A2A, dari config
- `/.well-known/logo.png` — static file dari `assets/kinko_logo.png`

## Anchor Program Devnet

Program `aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL` sudah deployed di devnet.
Upgrade authority: `data/agent-keypair.json`.
Deploy: `bun run deploy:contract` (build dulu dengan `bun run build:contract`).

## Existing Docs (dari sebelum setup)

- `docs/hk/idea.md` — Full product concept, demo script, revenue model, technical architecture
- `docs/hk/ecosystem.md` — Deep dive Metaplex ecosystem + code examples
- `docs/hk/integration-checklist.md` — Checklist integrasi untuk hackathon
