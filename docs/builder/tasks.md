# Tasks

## Backlog

- [ ] Real Marinade staking integration — replace simulated 8% APY with actual mSOL yield
- [ ] Deploy server to Railway/Fly.io with persistent ngrok or custom domain
- [ ] Deploy web to Vercel
- [ ] Agent B A2A flow — x402 payment + Jupiter price feed (code exists, untested end-to-end)
- [ ] Phase 6: $AGENT token via Metaplex Genesis — optional post-MVP
- [ ] Deposit button in frontend — currently disabled, needs Anchor CPI from web
- [ ] Setup TUI: end-to-end re-run test with auto-fill from existing .env
- [ ] set-treasury-agent: integrate into register-agent flow so it runs automatically after deposit

## Done

- [x] Setup automated docs infrastructure (CLAUDE.md, docs/builder/*) — completed 2026-04-01
- [x] Finalisasi monorepo structure — completed 2026-04-01
- [x] Phase 1: Anchor program kinko-treasury (initialize, deposit, deduct_yield, set_agent) — completed 2026-04-02
- [x] Phase 2: Agent Identity — Metaplex Core Asset + registerIdentityV1 + attributes — completed 2026-04-02
- [x] Phase 3: Agent A server runtime — treasury service, LLM via OpenRouter, chat route — completed 2026-04-02
- [x] Phase 4: Frontend dashboard — wallet adapter, treasury panel, chat panel, settings — completed 2026-04-02
- [x] Phase 5: Agent B A2A skeleton — Hono server, x402 probe/pay, Jupiter price — completed 2026-04-02
- [x] Setup TUI — interactive CLI for env setup + agent registration — completed 2026-04-02
- [x] Env rename: AGENT_A_URL → SERVER_URL, AGENT_PRIVATE_KEY → SERVER_AGENT_PRIVATE_KEY — completed 2026-04-02
- [x] Frontend config from server: GET /api/config returns programId, rpcUrl, agentAssetAddress — completed 2026-04-02
- [x] Dynamic server routes: /.well-known/agent.json, metadata.json, agent-card.json — completed 2026-04-02
- [x] Deploy Anchor program to devnet — completed 2026-04-02
- [x] set_agent script — links treasury PDA to server agent keypair — completed 2026-04-02
- [x] Dashboard smart contract section — Program ID, Agent Asset, Network stats — completed 2026-04-02
- [x] Settings 2-tab layout — Agent tab + Program tab — completed 2026-04-02
- [x] End-to-end test: deposit → yield → chat → tx hash verified on devnet — completed 2026-04-02
