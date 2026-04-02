# Current

## Phase
Phase 2 — Agent Identity (Metaplex Core Asset + Agent Registry)

## Currently Working On
- Creating `packages/solana/` (`@kinko/solana`) with agent setup scripts
- Setup Core Asset, registerIdentityV1, registerExecutiveV1, delegateExecutionV1

## Relevant Files
- `packages/solana/src/scripts/setup-agent.ts` — create Core Asset + register identity + delegate
- `packages/solana/src/scripts/update-attributes.ts` — update agent attributes after each request
- `packages/solana/src/scripts/query-agents.ts` — query agents from DAS API
- `packages/solana/src/umi.ts` — Umi setup helper
- `docs/plans/phase-2-agent-identity.md` — phase plan

## Important Context / Temporary Decisions
- Program ID: `aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL`
- Contract folder: `contract/` (bukan `programs/` atau `contracts/`)
- Anchor 0.32.1, Bun sebagai package manager
- Agent wallet = Asset Signer PDA (bukan keypair), operator sebagai Executive
- User → Agent A: yield-based | Agent A → Agent B: x402 (A2A)
- Agent A attributes: status, total_requests, total_yield_spent, service_endpoint, version
- Umi SDK used (not CLI) karena butuh code untuk scripts
- ERC-8004 registration URI format untuk agentRegistrationUri
- Devnet untuk development

## Next Up
- Phase 3: Agent A Runtime — yield deduction dari Anchor program, LLM integration, Attributes update setelah setiap request
