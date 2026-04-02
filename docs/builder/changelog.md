# Changelog

## 2026-04-02 — Rename: agent-a → server, packages/web → apps/web

- Renamed `apps/agent-a/` → `apps/server/` (package name `@kinko/server`)
- Moved `packages/web/` → `apps/web/` (package name `@kinko/web`)
- Updated root `package.json` scripts: `dev:agent-a` → `dev:server`, paths updated
- Updated `docs/architecture.md`, `docs/builder/current.md`, `docs/deploy/dev.md`
- Files: `package.json`, `apps/server/package.json`, `apps/web/package.json`

## 2026-04-02 — Phase 4 + 5: Frontend Dashboard + Agent B A2A

- **Phase 4 Frontend:**
  - Solana wallet adapter (Phantom + Solflare) in `components/wallet-provider.tsx`
  - `hooks/use-treasury.ts` — TanStack Query, reads treasury via agent-a API
  - `hooks/use-agent.ts` — agent health + agent card queries
  - `lib/api.ts` — typed API client for agent-a
  - `/app` page: treasury panel (principal, yield, progress bar) + chat panel (messages with yield receipts + tx links)
  - `/dashboard` page: agent stats, status badge, endpoints reference
  - Added shadcn: card, input, skeleton, scroll-area, textarea, sonner
  - HTTP 402 toast when yield insufficient
- **Phase 5 A2A:**
  - `apps/agent-b/` — Bun/Hono server, port 3002
  - `apps/agent-b/src/routes/agent-card.ts` — A2A agent card with x402 skill
  - `apps/agent-b/src/services/jupiter.ts` — SOL/USD price from Jupiter Price API v6
  - `apps/agent-b/src/routes/price.ts` — x402 protected: probe 402 → pay → get data
  - `apps/server/src/services/a2a.ts` — A2A client: probe, pay SOL tx, retry with X-Payment header
  - `apps/server/src/services/llm.ts` — auto-hires Agent B for price queries before LLM call
  - Root `package.json` dev scripts for server and agent-b
- Files: `apps/web/lib/api.ts`, `apps/web/hooks/*`, `apps/web/components/app/*`, `apps/web/components/dashboard/*`, `apps/agent-b/src/**`, `apps/server/src/services/a2a.ts`, `apps/server/src/services/llm.ts`

## 2026-04-02 — Phase 3: Agent A Runtime

- `apps/server/src/config.ts` — env-based config, keypair via AGENT_PRIVATE_KEY JSON byte array (no external file paths)
- `apps/server/src/services/treasury.ts` — getTreasuryInfo + checkAndDeductYield using @coral-xyz/anchor; yield computation mirrors Rust logic
- `apps/server/src/services/attributes.ts` — updateAgentStats via Umi + mpl-core; reads existing attrs then increments total_requests + total_yield_spent
- `apps/server/src/routes/chat.ts` — full flow: deduct yield → LLM → update attributes (non-blocking); GET /api/treasury/:wallet; HTTP 402 on insufficient yield
- `apps/server/.env.example` — documented all required env vars
- `packages/solana/src/umi.ts` — switched to OPERATOR_PRIVATE_KEY env var
- `docs/builder/memory.md` — rule: no external file paths, keypair via env var
- Files: `apps/server/src/config.ts`, `apps/server/src/services/treasury.ts`, `apps/server/src/services/attributes.ts`, `apps/server/src/routes/chat.ts`, `apps/server/.env.example`, `packages/solana/src/umi.ts`

## 2026-04-02 — Phase 2: Agent Identity + Web Redesign

- Created `packages/solana/` (`@kinko/solana`) package
- `src/umi.ts` — Umi setup helper (devnet, keypair from file)
- `src/scripts/setup-agent.ts` — create Core Asset, registerIdentityV1, registerExecutiveV1, delegateExecutionV1; logs addresses
- `src/scripts/update-attributes.ts` — update Attributes plugin on agent asset; exportable as module for agent backend
- `src/scripts/query-agents.ts` — DAS API query for agents by owner or collection (for A2A discovery)
- Redesigned web UI: dark purple Phantom-style theme matching logo (#b57bee lavender)
  - Updated `globals.css` CSS variables to deep purple dark theme
  - Redesigned all landing components (navbar, hero, how-it-works, features, cta) with purple glows, glass cards, gradient text
- Files: `packages/solana/package.json`, `packages/solana/tsconfig.json`, `packages/solana/src/umi.ts`, `packages/solana/src/scripts/setup-agent.ts`, `packages/solana/src/scripts/update-attributes.ts`, `packages/solana/src/scripts/query-agents.ts`, `apps/web/app/globals.css`, `apps/web/components/landing/*.tsx`

## 2026-04-01 — Bootstrap: Automated Docs Setup

- Created `CLAUDE.md` with Project Context and Automated Docs Protocol
- Created `docs/product_spec.md` — product overview stub (populated from idea.md)
- Created `docs/architecture.md` — architecture stub (populated from idea.md)
- Created `docs/builder/current.md` — active work tracker
- Created `docs/builder/tasks.md` — backlog from MVP scope in idea.md
- Created `docs/builder/changelog.md` — this file
- Created `docs/builder/decisions.md` — decision log stub
- Created `docs/builder/memory.md` — persistent context stub
- Files: `CLAUDE.md`, `docs/product_spec.md`, `docs/architecture.md`, `docs/builder/current.md`, `docs/builder/tasks.md`, `docs/builder/changelog.md`, `docs/builder/decisions.md`, `docs/builder/memory.md`
