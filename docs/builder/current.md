# Current

## Phase
Planning — menunggu review dan approval plans sebelum mulai build

## Currently Working On
- Plans sudah dibuat di `docs/plans/`, menunggu review dari owner

## Relevant Files
- `docs/plans/phase-0-scaffold.md` — monorepo boilerplate
- `docs/plans/phase-1-anchor-treasury.md` — Anchor program
- `docs/plans/phase-2-agent-identity.md` — Core Asset + Attributes
- `docs/plans/phase-3-agent-runtime.md` — Agent A + Agent B HTTP server
- `docs/plans/phase-4-token-economy.md` — Genesis + buyback
- `docs/plans/phase-5-frontend.md` — Next.js dashboard

## Important Context / Temporary Decisions
- Project name: **Kinko**
- **Monorepo:** Bun workspaces (TS) + Cargo workspace (Rust) — pakai `bun`, bukan `npm`/`node`
- Marinade Finance (mSOL) untuk liquid staking
- Anchor 0.31.x untuk smart contract treasury
- Agent B hanya demo A2A — bukan full product feature
- POV: Public User, Token Holder, Genesis Participant, Operator (CLI only)

## Next Up
- Owner review semua phase plans
- Setelah approved → mulai Phase 0 (scaffold)
