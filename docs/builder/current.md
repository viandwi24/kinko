# Current

## Phase
Phase 4 + 5 selesai — Frontend Dashboard + Agent B A2A

## Currently Working On
- Semua phase inti (1-5) sudah selesai
- Next: Phase 6 (Token / Genesis) — optional, atau polish + deploy

## Relevant Files
- `packages/web/app/app/page.tsx` + `components/app/` — /app page
- `packages/web/app/dashboard/page.tsx` + `components/dashboard/` — /dashboard page
- `packages/web/hooks/use-treasury.ts`, `use-agent.ts` — TanStack Query hooks
- `packages/web/lib/api.ts` — agent-a API client
- `packages/web/components/wallet-provider.tsx` — Solana wallet adapter
- `apps/agent-b/src/` — Agent B: x402 price oracle
- `apps/agent-a/src/services/a2a.ts` — A2A discovery + x402 payment
- `apps/agent-a/src/services/llm.ts` — auto-hires Agent B for price queries

## Important Context / Temporary Decisions
- Program ID: `aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL`
- **Keypair = env var JSON byte array** — jangan pernah pakai path ke luar folder project
- Agent B wallet di env `AGENT_B_WALLET` (pubkey base58)
- A2A x402 flow: probe 402 → pay SOL tx → retry with X-Payment header
- Agent A auto-detects price queries → hires Agent B via A2A
- Wallet adapter: Phantom + Solflare, devnet
- NEXT_PUBLIC_AGENT_URL + NEXT_PUBLIC_SOLANA_RPC_URL needed for frontend

## Next Up
- Phase 6: Token ($AGENT via Metaplex Genesis) — optional
- Deploy: Vercel (web) + Railway/Fly.io (agents)
- Polish: real Marinade staking integration
