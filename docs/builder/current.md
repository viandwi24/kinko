# Current

## Phase
Phase 1 — Anchor Treasury (selesai) → siap Phase 2

## Currently Working On
- Phase 1 selesai: kinko-treasury Anchor program dengan 7 tests passing
- Next: Phase 2 Agent Identity (Metaplex Core Asset + Agent Registry)

## Relevant Files
- `contract/programs/kinko-treasury/src/lib.rs` — program entry point
- `contract/programs/kinko-treasury/src/state/user_treasury.rs` — UserTreasury PDA struct
- `contract/programs/kinko-treasury/src/instructions/` — initialize, deposit, deduct_yield, set_agent
- `contract/programs/kinko-treasury/src/errors.rs` — KinkoError codes
- `contract/tests/kinko-treasury.ts` — 7 integration tests
- `docs/plans/phase-2-agent-identity.md` — next phase

## Important Context / Temporary Decisions
- Program ID: `aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL`
- Contract folder: `contract/` (bukan `programs/` atau `contracts/`)
- Anchor 0.32.1, Bun sebagai package manager
- Yield disimulasikan 8% APY berbasis waktu (bukan Marinade dulu) — Marinade jadi bonus
- Frontend: `packages/web/` | Backend: `apps/agent-a/`
- Agent wallet = Asset Signer PDA (bukan keypair), operator sebagai Executive
- User → Agent A: yield-based | Agent A → Agent B: x402 (A2A)

## Next Up
- Phase 2: Metaplex Core Asset + Agent Registry (registerIdentityV1, registerExecutiveV1, delegateExecutionV1)
