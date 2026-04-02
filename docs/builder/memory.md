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

## Existing Docs (dari sebelum setup)

- `docs/hk/idea.md` — Full product concept, demo script, revenue model, technical architecture
- `docs/hk/ecosystem.md` — Deep dive Metaplex ecosystem + code examples
- `docs/hk/integration-checklist.md` — Checklist integrasi untuk hackathon
