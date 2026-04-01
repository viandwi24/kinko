# Phase 5 — Frontend Dashboard

**Goal:** Public-facing Next.js app. Landing page + live stats + x402 playground + Genesis status.

---

## Pages & Components

### `/` — Landing Page
- [ ] Hero section: tagline, CTA "Try the Agent"
- [ ] Penjelasan singkat: treasury lock, x402 payment, token buyback
- [ ] Link ke Genesis page dan Playground

### `/dashboard` — Live Stats (read-only, tanpa wallet)
- [ ] **Treasury Stats** (read dari Anchor program via RPC)
  - Principal locked (SOL)
  - Available yield (SOL)
  - Marinade APY (dari Marinade API)
- [ ] **Agent Stats** (read dari Core Asset Attributes via DAS API)
  - Total requests served
  - Total buyback executed
  - Agent A & B status (online/offline)
- [ ] **Token Stats** (read dari on-chain)
  - $AGENT price (dari Jupiter)
  - Total supply
  - Buyback history (log dari Core Asset Attributes)
- [ ] **A2A Feed** — live feed transaksi terakhir (Agent A → Agent B)
  - Tampilkan: timestamp, tx hash, amount paid, Solana Explorer link

### `/playground` — Try the Agent (butuh wallet)
- [ ] Connect wallet (Solana wallet adapter: Phantom, Backpack, dll)
- [ ] Input field: ketik query
- [ ] Button "Send"
- [ ] Flow:
  - Cek balance $AGENT → tampilkan "Free Access" atau "0.005 SOL"
  - Jika paid: trigger x402 payment via wallet
  - Tampilkan loading state: "Agent A processing... hiring Agent B..."
  - Tampilkan hasil: respons AI + payment receipt
    - Amount paid
    - Agent B tx hash
    - Revenue split breakdown

### `/genesis` — Launch Pool
- [ ] Status launch pool: time remaining, total deposited, your share
- [ ] Connect wallet → deposit SOL form
- [ ] Estimasi: "Deposit X SOL → dapat ~Y $AGENT"
- [ ] Setelah window tutup: claim $AGENT button

---

## Tech Stack Frontend

```
apps/frontend/
├── app/
│   ├── page.tsx              ← landing
│   ├── dashboard/page.tsx
│   ├── playground/page.tsx
│   └── genesis/page.tsx
├── components/
│   ├── layout/               ← navbar, footer
│   ├── dashboard/            ← stats cards, A2A feed
│   ├── playground/           ← chat UI, payment flow
│   └── genesis/              ← deposit form, pool status
├── hooks/
│   ├── use-treasury.ts       ← read Anchor program state
│   ├── use-agent-stats.ts    ← read Core Asset Attributes via DAS API
│   ├── use-token-stats.ts    ← $AGENT price + supply
│   └── use-genesis.ts        ← launch pool state
└── lib/
    ├── solana.ts             ← RPC connection
    └── das-api.ts            ← DAS API queries
```

### Dependencies
```json
{
  "@solana/wallet-adapter-react": "latest",
  "@solana/wallet-adapter-wallets": "latest",
  "@solana/web3.js": "latest",
  "@metaplex-foundation/umi": "latest",
  "@metaplex-foundation/mpl-core": "latest"
}
```

---

## Checklist

- [ ] Next.js 15 setup + Tailwind
- [ ] Solana wallet adapter setup (provider di root layout)
- [ ] `use-treasury.ts` — baca Anchor PDA state
- [ ] `use-agent-stats.ts` — baca DAS API (Core Asset Attributes)
- [ ] Landing page selesai
- [ ] Dashboard page: semua cards live data
- [ ] Playground: connect wallet + x402 flow + hasil
- [ ] Genesis page: deposit form + pool status
- [ ] A2A feed: list transaksi terbaru

---

## Hasil Akhir Phase 5

- Frontend live (bisa di-deploy ke Vercel)
- Semua data live dari onchain (bukan mock/hardcoded)
- Playground bisa dipakai judges untuk test langsung
- Dashboard menunjukkan semua metrics real-time
