# Changelog

## 2026-04-02 — Phase 2: Agent Identity + Web Redesign

- Created `packages/solana/` (`@kinko/solana`) package
- `src/umi.ts` — Umi setup helper (devnet, keypair from file)
- `src/scripts/setup-agent.ts` — create Core Asset, registerIdentityV1, registerExecutiveV1, delegateExecutionV1; logs addresses
- `src/scripts/update-attributes.ts` — update Attributes plugin on agent asset; exportable as module for agent backend
- `src/scripts/query-agents.ts` — DAS API query for agents by owner or collection (for A2A discovery)
- Redesigned web UI: dark purple Phantom-style theme matching logo (#b57bee lavender)
  - Updated `globals.css` CSS variables to deep purple dark theme
  - Redesigned all landing components (navbar, hero, how-it-works, features, cta) with purple glows, glass cards, gradient text
- Files: `packages/solana/package.json`, `packages/solana/tsconfig.json`, `packages/solana/src/umi.ts`, `packages/solana/src/scripts/setup-agent.ts`, `packages/solana/src/scripts/update-attributes.ts`, `packages/solana/src/scripts/query-agents.ts`, `packages/web/app/globals.css`, `packages/web/components/landing/*.tsx`

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
