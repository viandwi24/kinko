# Phase 3 — Agent A Runtime

**Goal:** Agent A berjalan sebagai HTTP server. User request → cek yield → potong yield via Anchor → proses LLM → return hasil.

## Flow

```
User POST /api/chat { wallet, query }
  ↓
Cek Treasury PDA user: yield cukup?
  → tidak: return error "insufficient yield, deposit more SOL"
  → ya: lanjut
  ↓
Anchor program: deduct_yield() dari Treasury PDA user
  ↓
Panggil LLM (OpenAI/Anthropic)
  ↓
Update Core Asset Attributes Agent A (total_requests, total_yield_spent)
  ↓
Return { result, yield_spent, remaining_yield, tx_hash }
```

## Struktur

```
apps/agent-a/src/
├── index.ts              ← Bun.serve, route setup
├── routes/
│   ├── chat.ts           ← POST /api/chat (main service)
│   └── agent-card.ts     ← GET /.well-known/agent-card.json
├── services/
│   ├── treasury.ts       ← baca + potong yield dari Anchor program
│   ├── llm.ts            ← call OpenAI/Anthropic
│   └── attributes.ts     ← update Core Asset Attributes
└── config.ts             ← env vars, constants
```

## Checklist

### Server
- [ ] `Bun.serve()` di port 3001
- [ ] `GET /.well-known/agent-card.json` — Agent Card (untuk A2A nanti)
- [ ] `POST /api/chat` — main service

### Treasury Service
- [ ] Baca `get_available_yield()` dari Anchor PDA user
- [ ] Panggil `deduct_yield()` via Anchor client
- [ ] Handle error: insufficient yield

### LLM Service
- [ ] Call OpenAI atau Anthropic SDK
- [ ] Pass user query + context
- [ ] Return text response

### Attributes Service
- [ ] Setelah setiap request sukses:
  - `total_requests += 1`
  - `total_yield_spent += amount`
  - `last_active = now`

### Response Format
```typescript
{
  result: string,
  yield_spent: number,    // SOL
  remaining_yield: number, // SOL
  tx_hash: string         // deduct_yield tx
}
```

## ENV
```
AGENT_A_ASSET_ADDRESS=
OPERATOR_KEYPAIR=           // operator/executive keypair
SOLANA_RPC_URL=
ANCHOR_PROGRAM_ID=
OPENAI_API_KEY=
PORT=3001
```
