# Current

## Phase
Phase 0 — Scaffold (selesai) → siap Phase 1

## Currently Working On
- Phase 0 selesai: web frontend + agent-a backend sudah di-scaffold
- Next: Phase 1 Anchor Treasury

## Relevant Files
- `packages/web/` — Next.js 16, React 19, shadcn Radix Nova, TanStack Query, Zustand, Framer Motion
- `packages/web/app/page.tsx` — Landing page
- `packages/web/app/providers.tsx` — TanStack Query provider
- `packages/web/components/landing/` — Navbar, Hero, HowItWorks, Features, CTA
- `apps/agent-a/` — Hono backend, OpenAI, Bun runtime
- `apps/agent-a/src/index.ts` — entry point port 3001
- `docs/plans/phase-1-anchor-treasury.md` — next phase

## Important Context / Temporary Decisions
- Project name: **Kinko**
- Monorepo: Bun workspaces (TS) + Cargo (Rust) — pakai `bun`, bukan `npm`/`node`
- Frontend: `packages/web/` (bukan `apps/`)
- No axios — pakai native fetch
- shadcn on-demand: add komponen saat dibutuhkan via `bunx --bun shadcn@latest add <component>`
- Agent wallet = Asset Signer PDA (bukan keypair), operator sebagai Executive
- User → Agent A: yield-based (bukan x402)
- Agent A → Agent B: x402 (A2A)

## Next Up
- Phase 1: Anchor program agent-treasury (per-user PDA, principal lock, Marinade CPI)
