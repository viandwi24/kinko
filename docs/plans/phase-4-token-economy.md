# Phase 4 — Token Economy ($AGENT via Genesis)

**Goal:** Launch $AGENT token via Metaplex Genesis Launch Pool. Token punya real utility: free access, buyback beneficiary.

---

## Flow

```
Operator launch Genesis Launch Pool
  ↓
3-hari window: siapapun bisa deposit SOL
  ↓
Window tutup → token dibagi proporsional
  ↓
$AGENT listed di market (Raydium/Jupiter)
  ↓
Revenue dari x402 → 60% buyback $AGENT dari market
  ↓
Supply berkurang → nilai naik
```

---

## Checklist

### Genesis Launch Pool

- [ ] Script: `packages/solana/src/scripts/launch-token.ts`
  - Buat token mint ($AGENT)
  - Configure Launch Pool:
    - `totalSupply`: 1,000,000,000 (1B tokens)
    - `tokensForSale`: 200,000,000 (20% supply)
    - `depositCap`: sesuai kebutuhan demo
    - `minDeposit`: 0.1 SOL
    - `startTime` / `endTime`: window 3 hari (atau lebih pendek untuk demo)
  - Deploy via Metaplex Genesis SDK
  - Log: token mint address, launch pool address

- [ ] Script: `packages/solana/src/scripts/check-genesis.ts`
  - Query status launch pool (current deposits, time remaining)

### Token Gating (sudah disetup di Phase 3, butuh mint address)
- [ ] Isi `AGENT_TOKEN_MINT` di Agent A `.env`
- [ ] Test: wallet dengan 100+ $AGENT → free access ke `/api/analyze`
- [ ] Test: wallet tanpa $AGENT → kena x402

### Buyback Integration (sudah ada di Phase 3, perlu mint address)
- [ ] Isi `AGENT_TOKEN_MINT` di buyback executor
- [ ] Test buyback: swap 0.001 SOL → $AGENT via Jupiter devnet
- [ ] Verifikasi: supply $AGENT berkurang setelah buyback

### Revenue Split Update
- [ ] SOL dari Genesis deposits → masuk ke Agent Treasury (Anchor program)
- [ ] Auto-stake ke Marinade (atau manual untuk demo)
- [ ] Update Core Asset Attributes: `treasury_balance` setelah deposit

---

## Token Utility Summary

| Hold Amount | Benefit |
|-------------|---------|
| 0 $AGENT | Bayar 0.005 SOL per request |
| ≥100 $AGENT | Free unlimited access |
| Any amount | Profiting dari buyback (supply berkurang) |

---

## Hasil Akhir Phase 4

- $AGENT token live di devnet
- Genesis launch pool bisa diikuti (deposit SOL → dapat $AGENT)
- Token gating berjalan di Agent A
- Buyback executor berjalan otomatis setelah setiap revenue batch
- Semua metrics terupdate di Core Asset Attributes
