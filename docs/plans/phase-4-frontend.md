# Phase 4 — Frontend

**Goal:** Next.js app. User bisa deposit SOL, lihat yield, dan chat dengan Agent A.

## Pages

### `/` — Landing
- Hero: "AI agent powered by your staking yield"
- CTA: "Deposit SOL & Start"

### `/app` — Main App (butuh connect wallet)
- **Treasury Panel**
  - Principal locked (SOL)
  - Available yield (SOL)
  - Marinade APY
  - Button: "Deposit SOL"
- **Chat Panel**
  - Input field + send button
  - Response dari Agent A
  - Receipt per message: yield spent, remaining, tx hash

### `/dashboard` — Stats (publik, read-only)
- Agent A stats dari Core Asset Attributes (via DAS API)
  - Total requests served
  - Total yield processed
  - Status: online/offline

## Checklist

- [ ] Next.js 15 + Tailwind
- [ ] Solana wallet adapter (Phantom, Backpack)
- [ ] `hooks/use-treasury.ts` — baca Anchor PDA state
- [ ] `hooks/use-agent.ts` — baca Core Asset Attributes via DAS API
- [ ] Landing page
- [ ] `/app` — deposit form + chat UI
- [ ] `/dashboard` — agent stats
- [ ] Deploy ke Vercel
