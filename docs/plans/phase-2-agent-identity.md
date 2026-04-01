# Phase 2 — Agent Identity (Metaplex Core + Asset Signer)

**Goal:** Agent A terdaftar onchain sebagai Core Asset. Kita (operator) terdaftar sebagai Executive dan mendapat delegation untuk sign atas nama agent.

## Konsep Agent Wallet

```
Core Asset (MPL Core)
  └── Asset Signer (PDA) ← wallet agent, NO private key

Kita sebagai operator:
  1. registerExecutiveV1() → buat Executive Profile
  2. delegateExecutionV1() → link agent ke executive kita
  3. Sekarang kita bisa sign transaksi atas nama agent
```

## Checklist

### Script: `packages/solana/src/scripts/setup-agent.ts`
- [ ] Create Core Asset untuk Agent A
  - name: `"Kinko Agent A"`
  - plugins: Attributes (initial values)
- [ ] `registerIdentityV1()` — register agent identity
- [ ] `registerExecutiveV1()` — register operator sebagai executive
- [ ] `delegateExecutionV1()` — delegate Agent A ke operator
- [ ] Log: Asset address, Asset Signer PDA address, Executive Profile address

### Attributes Initial Values
```
status: "active"
total_requests: "0"
total_yield_spent: "0"
service_endpoint: "<url>/api/chat"
version: "1.0.0"
```

### Script: `packages/solana/src/scripts/update-attributes.ts`
- [ ] `updateAgentAttributes(assetAddress, attributes)` — dipanggil setelah setiap request

### Script: `packages/solana/src/scripts/query-agents.ts`
- [ ] Query DAS API untuk list agents di registry
- [ ] Filter by attributes (untuk A2A discovery di phase 5)

## Dependencies
```bash
bun add @metaplex-foundation/mpl-agent-registry
bun add @metaplex-foundation/mpl-core
bun add @metaplex-foundation/umi
bun add @metaplex-foundation/umi-bundle-defaults
```
