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
│   ├── frontend/         ← Next.js dashboard (public UI)
│   ├── agent-a/          ← Agent A runtime (x402 server + A2A orchestrator)
│   └── agent-b/          ← Agent B runtime (x402 server + A2A endpoint)
│
├── packages/
│   ├── solana/           ← Shared Solana/Metaplex/Umi utilities
│   └── x402/             ← Shared x402 helpers
│
└── programs/
    └── agent-treasury/   ← Anchor program (principal lock + yield spending)
        ├── Cargo.toml
        ├── src/lib.rs
        └── tests/        ← Anchor TypeScript tests (via Bun)
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

## Revenue Flow

```
INCOME:
  x402 fees (per request)  +  Marinade yield (passive)
          ↓
SPLIT (otomatis di agent-a):
  60% → buyback executor → swap SOL → $AGENT via Jupiter
  30% → operating budget (bayar Agent B via A2A x402)
  10% → protocol fee
```

## POV / Roles

| Role | Siapa | Akses |
|------|-------|-------|
| Public User | Siapapun | Frontend publik, x402 playground, beli $AGENT |
| Token Holder | Hold $AGENT | Free access jika ≥100 $AGENT, priority queue |
| Genesis Participant | Early depositor | Deposit SOL → dapat $AGENT proporsional |
| Operator/Admin | Kita (deployer) | CLI scripts, deploy program, monitor treasury |
