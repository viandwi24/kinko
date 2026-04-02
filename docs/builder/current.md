# Current

## Phase
A2A discovery via Metaplex registry — refactor selesai, perlu Helius API key + agent lain di registry

## Currently Working On
- A2A discovery flow sudah diimplementasi, belum ditest end-to-end
- Perlu: HELIUS_API_KEY di apps/server/.env + minimal 1 agent lain terdaftar di registry

## Relevant Files
- `apps/server/src/services/treasury.ts` — yield calc (mirrors Rust, YIELD_RATE_BPS must stay in sync with contract)
- `apps/server/src/routes/agent-card.ts` — all /.well-known/* routes, fully dynamic from config
- `apps/server/src/config.ts` — single source of truth for server env vars
- `apps/server/src/routes/chat.ts` — deduct yield → LLM → update attributes
- `apps/web/components/dashboard/dashboard-shell.tsx` — dashboard with agent + smart contract sections
- `apps/web/components/settings/settings-shell.tsx` — 2-tab settings (Agent / Program)
- `apps/web/hooks/use-agent.ts` — useAgentCard, useAgentHealth, useServerConfig
- `apps/web/lib/api.ts` — SERVER_URL (NEXT_PUBLIC_AGENT_URL) + all fetch helpers
- `contract/programs/kinko-treasury/src/state/user_treasury.rs` — YIELD_RATE_BPS constant
- `scripts/register-agent.ts` — registers agent, writes asset address back to .env
- `scripts/update-agent-name.ts` — updates Core Asset name + URI onchain
- `scripts/set-treasury-agent.ts` — must be run after deposit to link agent pubkey to treasury (lives in contract/scripts/)
- `contract/scripts/set-treasury-agent.ts` — actual location (runs from contract/ for module resolution)

## Important Context / Temporary Decisions
- Program ID: `aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL` — deployed on devnet
- **YIELD_RATE_BPS must be kept in sync**: `contract/programs/kinko-treasury/src/state/user_treasury.rs` AND `apps/server/src/services/treasury.ts` — both set to 800 (8% APY)
- **treasury.agent field**: after initialize, agent = Pubkey::default(). Must call `set_agent` via `bun run set-treasury-agent` before chat works
- **Frontend only needs NEXT_PUBLIC_AGENT_URL** — all other config (programId, rpcUrl, agentAssetAddress) fetched from GET /api/config
- All JSON metadata (agent.json, metadata.json, agent-card.json) are dynamic server routes — no files
- Scripts in `scripts/` use dynamic import after setting process.env (static import runs before env is set)
- `data/agent-keypair.json` = upgrade authority for the Anchor program on devnet
- ngrok URL as SERVER_URL required so Metaplex registry can access /.well-known/metadata.json
- COST_PER_REQUEST_LAMPORTS=1000000 (0.001 SOL per chat request)
- Agent asset visible at: https://www.metaplex.com/agents/49r61vKJVDrvWRv9EnoW5uDWQ4WS4TK8bAXM7U7rkZMq?network=solana-devnet

## Next Up
- Set HELIUS_API_KEY di apps/server/.env (dapat dari helius.dev)
- Register agent lain di devnet yang punya skill berbeda (atau pakai agent dari tim lain)
- Test A2A end-to-end: tanya "SOL price" → discovery → x402 payment → 2 tx onchain
- Real Marinade staking integration (replace simulated yield)
- Deploy: Vercel (web) + Railway/Fly.io (server)
