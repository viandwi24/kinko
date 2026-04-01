# Idea 1: AgentVault — Yield-Powered Autonomous Token Buyback

> **Tagline:** "An AI agent that funds itself, pays other agents, and buys back its own token — all autonomously."

---

## The One-Liner

Agent yang punya treasury sendiri, staking SOL untuk generate yield, menyediakan service berbayar via x402, dan menggunakan semua revenue itu untuk buyback token-nya sendiri yang di-launch via Metaplex Genesis.

---

## Problem

Dua masalah nyata di ekosistem Solana agent hari ini:

**Problem 1: Agent token = memecoin**
99% AI agent token di Solana diluncurkan lalu mati. Tidak ada mekanisme yang menghubungkan performa agent dengan nilai token. Harga naik karena hype, turun karena tidak ada yang backing nilai.

**Problem 2: Agent tidak punya "uang sendiri" yang aman**
Agent yang punya akses ke treasury bisa drain semua funds — bug, exploit, atau salah logic bisa habiskan semua SOL. Tidak ada mekanisme "agent hanya boleh pakai sekian."

---

## Solution

**Gabungan dua konsep proven:**

**Dari yield treasury pattern (terbukti menang hackathon):**
> Deposit SOL → stake → agent hanya bisa pakai yield. Principal aman.

**Dari DeFi buyback (Raydium $196M, Pump.fun $323M, Hyperliquid $386M):**
> Revenue dari protocol → auto-buyback token → supply berkurang → nilai naik.

**Digabungkan:**
> Deposit SOL ke agent → di-stake via Marinade → yield + x402 service revenue → auto-buyback $AGENT token yang di-launch via Genesis → token holders dapat akses premium.

---

## Why Now

| Signal | Detail |
|--------|---------|
| **Metaplex Genesis baru mature** | SDK stable, partnership Marinade × Genesis baru diumumkan, belum ada yang implement |
| **x402 hit 35M+ transactions** | Payment infrastructure sudah production-ready di Solana |
| **A2A menjadi standar** | Google A2A protocol masuk Linux Foundation — momentum adopsi |
| **Agent token narrative** | Virtuals Protocol ($BASE) tunjukkan demand untuk agent token economy, belum ada versi Solana-native |

---

## Demo Script (2 Menit)

```
[0:00] "Ini AgentVault — AI agent yang manage tokenomics-nya sendiri."

[0:10] "Agent kita terdaftar di Metaplex Registry sebagai Core Asset."
       → Show: Core Asset di Solana explorer + Attributes live

[0:25] "User deposit SOL ke treasury. SOL otomatis di-stake via Marinade."
       → Show: deposit tx, mSOL balance naik

[0:40] "Agent launch token $AGENT via Metaplex Genesis Launch Pool."
       → Show: Genesis tx, token listed di market

[0:55] "User bayar 0.005 SOL via x402 untuk tanya ke agent."
       → Show: x402 request, agent response

[1:10] "Agent butuh data dari Agent B — bayar otomatis via x402 juga."
       → Show: A2A payment tx di explorer (ini yang impresif, dua x402 dalam satu flow)

[1:25] "Revenue masuk: 60% langsung buyback $AGENT dari market."
       → Show: buyback tx, token price naik

[1:40] "Semua data ini live on-chain di Core Asset Attributes."
       → Show: Attributes plugin data via DAS API

[1:55] "Dual revenue: x402 fees + Marinade yield. Buyback tidak pernah berhenti."
       → Show: yield → buyback pool flow diagram
```

---

## MVP Scope (3 Core Loops)

### Loop 1 — Agent Identity (Metaplex ✓)
- [ ] Agent A registered sebagai Core Asset dengan Attributes plugin
- [ ] Agent B registered sebagai Core Asset terpisah (wallet berbeda)
- [ ] Attributes live: `treasury_balance`, `total_requests`, `x402_endpoint`, `a2a_card_url`
- [ ] Keduanya terdaftar di Agent Registry (discoverable, bukan hardcoded)

### Loop 2 — A2A + x402 Payment Flow (A2A + x402 ✓)
- [ ] Agent A expose x402 service (AI text analysis)
- [ ] Agent B expose x402 service (SOL price data via Jupiter API)
- [ ] Agent B expose `/.well-known/agent-card.json` dan A2A JSON-RPC endpoint
- [ ] Agent A discover Agent B via Registry → hire via x402 → real onchain payment
- [ ] User → Agent A via x402 → Agent A → Agent B via x402 (dua transaksi verifiable)

### Loop 3 — Token Economy (Genesis ✓)
- [ ] $AGENT token launched via Metaplex Genesis Launch Pool dari agent wallet
- [ ] Revenue split: 60% buyback pool, 30% operating budget, 10% protocol
- [ ] Buyback executor: swap SOL dari pool → $AGENT (via Jupiter)
- [ ] Buyback metrics update ke Core Asset Attributes setiap eksekusi

---

## Agent B: Spec

Agent B bukan "fitur produk" — dia adalah **saksi A2A yang bisa diverifikasi onchain**. Judges perlu lihat dua Core Asset berbeda, dua wallet berbeda, dua transaksi berbeda.

**Spesifikasi Agent B:**
```
Core Asset: PriceAgent v1
Wallet: <agent-b-keypair>
Skill: "sol-price" — return SOL/USD price dari Jupiter API
Endpoint: https://agent-b.domain/.well-known/agent-card.json
x402 price: 0.002 SOL per request
Registry: discoverable via Attributes plugin (a2a_card_url)
```

**Flow A2A yang terjadi:**
```
User request: "Analisis SOL hari ini"
      ↓
Agent A (0.005 SOL dari user via x402)
      ↓
Agent A discover Agent B via DAS API query
      ↓
Agent A kirim x402 request ke Agent B
Agent B reply: 402 Payment Required: 0.002 SOL
Agent A bayar dari operating budget
Agent B deliver: SOL price data
      ↓
Agent A compile + analisis dengan LLM
Agent A deliver hasil ke user
      ↓
Net revenue: 0.003 SOL → split 60/30/10
```

---

## Token Economy ($AGENT)

### Cara Orang Dapat Token

**Cara 1 — Genesis Launch Pool (Early Adopters)**
```
Agent buka deposit window selama 3 hari.
Siapapun bisa deposit SOL.
Setelah window tutup, token dibagi proporsional:
  → Deposit 10 SOL dari total 100 SOL = dapat 10% token
  → Fair price discovery, tidak ada harga special untuk siapapun.
SOL yang terkumpul → masuk agent treasury → di-stake Marinade.
```

**Cara 2 — Beli di DEX kapanpun (User Biasa)**
```
Setelah Genesis selesai → $AGENT listed di Raydium/Jupiter.
User baru bisa beli kapanpun, tidak ketinggalan.
```

### Kegunaan Token (Utility)

| Utility | Penjelasan | Implementasi |
|---------|-----------|--------------|
| **Premium Access** | Hold 100+ $AGENT = akses gratis unlimited | Cek token balance via RPC sebelum serve request |
| **Buyback Beneficiary** | Revenue terus masuk → buyback → supply berkurang | Auto-execute setelah setiap revenue batch |
| **Priority Queue** | Saat demand tinggi, $AGENT holders dilayani lebih dulu | Queue dengan prioritas berdasarkan balance |
| **Reputation Signal** | Total x402 requests sukses di-store di Core Asset Attributes | DAS API queryable |

### Token Gating Implementation

```typescript
// Sebelum serve request, cek token balance
async function checkAccess(userWallet: string): Promise<'free' | 'paid'> {
  const balance = await connection.getTokenAccountBalance(
    getAssociatedTokenAddress(AGENT_TOKEN_MINT, new PublicKey(userWallet))
  )
  return balance.value.uiAmount >= 100 ? 'free' : 'paid'
}

// Di route handler
const access = await checkAccess(userWallet)
if (access === 'paid') {
  // Verify x402 payment header dulu
  await verifyX402Payment(req.headers.get('X-PAYMENT'))
}
// Lanjut serve request
```

---

## Revenue Model (Dual Revenue Stream)

```
SUMBER REVENUE 1: x402 Service Fees (Variable)
  User bayar per request → revenue langsung masuk
  Makin banyak user → makin besar buyback

SUMBER REVENUE 2: Marinade Staking Yield (Guaranteed) [BONUS]
  Treasury SOL di-stake → 6-8% APY
  Yield jalan terus bahkan kalau ZERO user
  → Ini "buyback floor" yang tidak pernah berhenti

PEMBAGIAN REVENUE:
  ├── 60% → auto-buyback $AGENT token dari market
  ├── 30% → agent operating budget (bayar agent lain via A2A)
  └── 10% → protocol fee / development
```

**Note MVP:** Revenue dari x402 fees sudah cukup untuk showcase buyback. Marinade yield adalah bonus — diimplementasi hanya kalau core loop sudah selesai.

---

## Metaplex Integration (6 Touchpoints)

| # | Komponen | Dipakai Untuk | Depth |
|---|----------|---------------|:-----:|
| 1 | **Core Asset** | Agent A + Agent B terdaftar sebagai Core Assets dengan wallet sendiri | Deep |
| 2 | **Core Attributes Plugin** | Store live data on-chain: treasury_balance, total_requests, total_buyback, yield_apy | Deep |
| 3 | **Agent Registry** | Agent discoverable — Agent A discover Agent B via DAS API, bukan hardcoded | Deep |
| 4 | **Genesis Launch Pool** | $AGENT token diluncurkan oleh agent wallet, fair distribution | Deep |
| 5 | **x402 Protocol** | Payment flow user→agent dan agent→agent, settlement di Solana | Deep |
| 6 | **DAS API** | Semua metrics queryable tanpa custom indexer, via Core Asset Attributes | Medium |

---

## Prior Art (Bukti Konsep Proven)

| Komponen | Prior Art | Status di Solana/Metaplex |
|----------|-----------|:-------------------------:|
| Yield treasury untuk agent | Yield treasury pattern (menang hackathon) | ❌ Belum ada di Solana |
| Auto-buyback dari revenue | Raydium $196M, Pump.fun $323M, Hyperliquid $386M | ❌ Belum via Genesis |
| Marinade × Genesis buyback | Diumumkan sebagai partnership | ❌ Belum diimplementasi siapapun |
| Agent token dengan real utility | Virtuals Protocol (Base/Ethereum) | ❌ Belum Metaplex-native |

**Kesimpulan:** Setiap komponen sudah proven di tempat lain. Kita yang pertama satukan semuanya di Solana + Metaplex.

---

## Competitive Differentiation

| Competitor | Masalah | Kita |
|------------|---------|------|
| agent-protocol | Tidak pakai Metaplex | Metaplex-native (Core Asset + Genesis) |
| PayCrow | Hanya escrow x402, tidak ada token | Full token economy + buyback |
| Virtuals Protocol | Ethereum/Base, bukan Solana | Solana-native, Genesis SDK |
| Pump.fun agent tokens | Pakai Pump.fun launchpad | Pakai Metaplex Genesis |
| Yield treasury projects | Ethereum, tidak ada token buyback | Solana + Genesis + buyback |
| aiPool | Eliza + Metaplex tapi tidak ada yield treasury | Dual revenue: yield + x402 |

**Satu kalimat:** Satu-satunya project yang menggabungkan yield treasury + Genesis token launch + x402 A2A + auto-buyback, semuanya Metaplex-native di Solana.

---

## Technical Architecture

```
FRONTEND (Next.js + Tailwind)
  ├── Landing page + demo
  ├── Dashboard: treasury, buyback, A2A feed, token stats
  ├── x402 service playground (try it live)
  ├── Genesis launch pool status
  └── Core Asset Attributes live view (via DAS API)

BACKEND (Node.js / TypeScript)
  ├── Agent A Runtime (x402 service + A2A orchestrator)
  ├── Agent B Runtime (x402 service + A2A server)
  ├── x402 middleware (payment verification)
  ├── Buyback executor (swap SOL → $AGENT via Jupiter)
  └── Core Asset Attributes updater (per-transaction)

SOLANA / METAPLEX
  ├── @metaplex-foundation/mpl-core (Core Asset, Attributes)
  ├── @metaplex-foundation/mpl-genesis (token launch)
  ├── DAS API (asset queries)
  └── [BONUS] Anchor treasury program (jika waktu memungkinkan)

EXTERNAL INTEGRATIONS
  ├── Marinade Finance SDK (mSOL staking) [BONUS]
  ├── Jupiter Aggregator SDK (buyback swap)
  └── x402-solana package (payment protocol)
```

---

## Score Boosters (Tier 2 — Kalau Core Selesai)

- [ ] **Reputation Score** di Core Asset Attributes — naik tiap x402 sukses
- [ ] **Marinade yield** sebagai secondary buyback source
- [ ] **3-tier token gating** (0, 100, 1000 $AGENT)
- [ ] **Transparent buyback log** on-chain via Attributes
- [ ] **20+ tests** (unit + integration)
- [ ] **DAS API** queryable dari frontend
- [ ] **Zero Trust treasury** — multisig separation (operating budget vs principal)

---

## Risiko dan Mitigasi

| Risiko | Mitigasi |
|--------|---------|
| Marinade integration kompleks | MVP bisa tanpa Marinade — buyback dari x402 revenue saja sudah cukup |
| Genesis Launch Pool perlu SOL untuk seed | Demo fund dari wallet kita sendiri — acceptable untuk hackathon |
| Agent B harus live saat demo | Deploy Agent B terpisah, bisa di server murah / Railway / Render |
| Buyback butuh liquidity di DEX | Bisa pakai Jupiter dengan slippage tinggi untuk demo |
| Scope terlalu luas | Ikuti 3 Core Loop di atas. Score boosters hanya kalau core selesai. |

---

## Referensi

- [Marinade × Genesis Partnership](https://marinade.finance/blog/powering-sustainable-token-launches-with-metaplex-genesis) — Announced, belum diimplementasi
- [Metaplex Genesis SDK](https://developers.metaplex.com/smart-contracts/genesis) — Token launch infrastructure
- [Metaplex Core Attributes Plugin](https://developers.metaplex.com/core/plugins/attribute) — On-chain data storage
- [x402 Protocol](https://solana.com/x402/what-is-x402) — Payment infrastructure (35M+ transactions)
- [Raydium Buyback $196M](https://www.ainvest.com/news/raydium-196m-token-buyback-catalyst-solana-defi-dominance-2508/) — Bukti buyback works di Solana
- [Pump.fun Buyback $323M](https://cryptorank.io/news/feed/6475a-pump-fun-205m-token-buyback) — Bukti agent token buyback works di Solana
- [Virtuals Protocol](https://whitepaper.virtuals.io/info-hub/builders-hub/more-on-standard-launch) — Agent token economy reference (Ethereum)
- [Solana Agent Registry](https://solana.com/agent-registry/what-is-agent-registry) — A2A discovery infrastructure
