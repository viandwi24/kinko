# Architecture

<!-- TODO: Update detail per package saat implementasi dimulai -->

## Monorepo Structure

Hybrid monorepo: **Bun workspaces** (TypeScript) + **Cargo workspace** (Rust/Anchor).

```
kinko/
├── package.json          ← Bun workspaces root (apps/*, packages/*)
├── Cargo.toml            ← Cargo workspace root (programs/*)
│
├── apps/
│   ├── web/              ← Next.js frontend (public UI)
│   ├── server/           ← Backend API + AI agent runtime (Hono, port 3001)
│   └── agent-b/          ← Price oracle agent — x402 endpoint (Hono, port 3002)
│
├── packages/
│   └── solana/           ← Shared Solana/Metaplex/Umi utilities + setup scripts
│
└── contract/
    └── programs/
        └── kinko-treasury/ ← Anchor program (principal lock + yield spending)
```

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Runtime | Bun |
| Language | TypeScript (apps, packages) + Rust (programs) |
| Package manager | Bun workspaces |
| Rust workspace | Cargo |
| Anchor version | 0.31.x |
| Frontend | Next.js + Tailwind CSS |
| Blockchain | Solana (devnet untuk dev, mainnet untuk demo) |
| Metaplex | Umi + mpl-core + mpl-genesis |
| Liquid staking | Marinade Finance (mSOL) |
| Payments | x402-solana, @x402/express |
| DEX/Swap | Jupiter SDK (buyback) |
| AI/LLM | OpenAI atau Anthropic SDK |

## Anchor Program: `agent-treasury`

Program yang enforce treasury rules onchain:

```
PDA State:
├── owner_pubkey          — bisa deposit + pause
├── agent_pubkey          — satu-satunya yang bisa panggil spend()
├── principal_msol        — mSOL yang di-lock (tidak bisa diambil)
├── initial_sol_value     — baseline nilai saat deposit
├── total_spent           — akumulasi yang sudah dipakai
└── is_paused             — freeze flag

Instructions:
├── deposit()             — user/operator kirim SOL → stake ke Marinade → lock mSOL
├── spend(amount, to)     — hanya agent_pubkey, hanya dari available yield
├── pause() / unpause()   — hanya owner
└── get_available_yield() — view: current mSOL value - initial - spent
```

## Revenue Flow (MVP)

```
INCOME:
  x402 fees (per request)  +  Marinade yield (passive)
          ↓
SPLIT:
  ~90% → operating budget (bayar Agent B via A2A x402)
  ~10% → protocol fee

NOTE: Token buyback ($AGENT via Jupiter) adalah post-MVP feature,
belum diimplementasi.
```

## POV / Roles

| Role | Siapa | Akses |
|------|-------|-------|
| Public User | Siapapun | Frontend publik, deposit SOL, chat via yield |
| Operator/Admin | Kita (deployer) | CLI scripts, deploy program, monitor treasury |

> Token-gated access ($AGENT holder) dan Genesis Participant role
> adalah post-MVP — belum diimplementasi.
