# Phase 5 — Agent B + A2A

**Goal:** Agent B terdaftar onchain, expose x402 API. Agent A bisa discover + hire Agent B otomatis.

## Agent B Role
- Data provider: SOL price dari Jupiter
- Expose x402 endpoint: bayar → dapat data
- Terdaftar di Metaplex registry (discoverable)

## Flow A2A
```
Agent A butuh data harga SOL
  ↓
Query DAS API: cari agent dengan skill "sol-price"
  ↓
Ketemu Agent B → kirim request
  ↓
Agent B: "bayar 0.001 SOL" (x402)
  ↓
Agent A bayar dari Asset Signer wallet (onchain, verifiable)
  ↓
Agent B kasih data
  ↓
Agent A compile + return ke user
```

## Checklist
- [ ] Core Asset Agent B + identity + delegation
- [ ] `apps/agent-b/` — Bun server
  - [ ] `GET /.well-known/agent-card.json`
  - [ ] `POST /api/price` — dilindungi x402 (0.001 SOL)
  - [ ] Fetch SOL price dari Jupiter API
- [ ] Agent A: tambah logic untuk discover + hire Agent B
- [ ] Test: 2 tx onchain verifiable (user → Agent A yield, Agent A → Agent B x402)
