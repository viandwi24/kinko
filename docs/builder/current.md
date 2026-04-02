# Current

## Phase
Setup TUI selesai — siap testing end-to-end

## Currently Working On
- Semua phase inti (1-5) selesai + setup TUI selesai
- Ready untuk testing: `bun run setup` lalu `bun run dev`

## Relevant Files
- `apps/setup-tui/src/App.tsx` — state machine 8-step TUI flow
- `apps/setup-tui/src/screens/` — WalletFund, Preview, KeypairSetup, BaseUrlSetup, etc.
- `apps/setup-tui/src/config/services.ts` — 4 env modes + field definitions
- `apps/web/lib/api.ts` — SERVER_URL + all fetch helpers
- `apps/web/hooks/use-agent.ts` — useAgentCard, useAgentHealth, useAgentMetadata
- `apps/server/src/services/llm.ts` — Vercel AI SDK + OpenRouter
- `apps/server/src/routes/chat.ts` — accepts model? in body
- `apps/server/src/routes/agent-card.ts` — serves /.well-known/agent.json
- `docs/deploy/dev.md` — full dev setup guide
- `docs/test/0-normal-case.md` — test scenario

## Important Context / Temporary Decisions
- Program ID: `aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL`
- **Keypair = env var JSON byte array** — jangan pernah pakai path ke luar folder project
- TUI step order: env-select → base-url → keypair-setup → wallet-fund → service-select → field-input → preview → agent-register → done
- KEYPAIR_FIELDS (AGENT_PRIVATE_KEY, OPERATOR_PRIVATE_KEY) auto-filled, tidak ditampilkan di input
- `data/` folder = gitignored, stores agent-keypair.json + agent-metadata.json
- ngrok URL harus diisi sebagai Server URL untuk devnet (agar Metaplex registry bisa akses metadata)
- AI: Vercel AI SDK + @openrouter/ai-sdk-provider — model per-request via body.model
- AirdropSetup.tsx dihapus, diganti WalletFund.tsx

## Next Up
- Test end-to-end: `bun run setup` (TUI) → `bun run dev` → deposit → chat
- Phase 6: Token ($AGENT via Metaplex Genesis) — optional, setelah MVP works
- Deploy: Vercel (web) + Railway/Fly.io (apps/server, apps/agent-b)
- Polish: real Marinade staking integration
