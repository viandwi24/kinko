# Phase 0 — Monorepo Scaffold

**Goal:** Semua folder, config, dan boilerplate siap. Tidak ada logic bisnis — hanya struktur.

## Struktur Target

```
kinko/
├── package.json          ← Bun workspaces
├── Cargo.toml            ← Cargo workspace
├── tsconfig.json         ← Base TS config
├── .env.example
├── apps/
│   ├── agent-a/          ← AI service (Bun HTTP server)
│   └── frontend/         ← Next.js dashboard
├── packages/
│   ├── solana/           ← @kinko/solana (Umi, Metaplex utils)
│   └── x402/             ← @kinko/x402 (middleware + client)
└── programs/
    └── agent-treasury/   ← Anchor program
```

## Checklist

### Root
- [ ] `tsconfig.json` — base config, di-extend semua package
- [ ] `.env.example` — template semua env vars

### `packages/solana/` — @kinko/solana
- [ ] `package.json`
- [ ] `tsconfig.json`
- [ ] `src/index.ts`
- [ ] `src/umi.ts` — setup Umi + mpl-core + mpl-agent-registry
- [ ] `src/keypair.ts` — load keypair dari env helper

### `packages/x402/` — @kinko/x402
- [ ] `package.json`
- [ ] `tsconfig.json`
- [ ] `src/index.ts`
- [ ] `src/client.ts` — x402 client (untuk agent yang bayar agent lain)

### `apps/agent-a/` — @kinko/agent-a
- [ ] `package.json`
- [ ] `tsconfig.json`
- [ ] `src/index.ts` — Bun.serve entry point
- [ ] `.env.example`

### `apps/frontend/` — @kinko/frontend
- [ ] Next.js 15 + Tailwind setup
- [ ] `package.json`

### `programs/agent-treasury/`
- [ ] `Cargo.toml`
- [ ] `src/lib.rs` — declare_id! + empty program
- [ ] `Anchor.toml`
- [ ] `tests/agent-treasury.ts`
