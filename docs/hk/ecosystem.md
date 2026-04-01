# Panduan Ekosistem Metaplex Agents Track
## Penjelasan Mendalam + Analogi Awam + Code Preview (TypeScript)

---

## Daftar Isi

1. Metaplex — Apa Sih Ini?
2. Metaplex Core — Standar Baru NFT/Asset
3. Umi — "Remote Control" Universal Metaplex
4. Metaplex Agent Registry — KTP Digital untuk AI Agent
5. x402 Protocol — Sistem Bayar Otomatis Antar Mesin
6. A2A (Agent-to-Agent) — Agent Ngobrol & Kerja Sama
7. Metaplex Genesis — Pabrik Token Launch
8. Solana Agent Kit — Toolbox Siap Pakai
9. Peta Koneksi Seluruh Ekosistem
10. NPM Packages & SDK Lengkap

---

## 1. Metaplex — Apa Sih Ini?

**Definisi teknis:** Metaplex adalah kumpulan smart contract (program) di Solana yang menyediakan infrastruktur untuk membuat, mengelola, dan memperdagangkan digital assets (NFT, token, dll).

**Analogi awam:** Bayangkan Solana itu sebuah kota besar. Metaplex itu seperti **kantor catatan sipil + notaris + bank** di kota itu. Kamu mau bikin identitas digital? Ke Metaplex. Mau terbitkan aset? Ke Metaplex. Mau launch token? Ke Metaplex. Mereka menyediakan infrastruktur dasar yang dipakai semua orang di kota Solana.

**Kenapa penting buat hackathon:** Hackathon ini **disponsori Metaplex**, jadi mereka ingin melihat kita pakai teknologi mereka sedalam mungkin. Semakin dalam integrasi kita ke Metaplex = semakin tinggi skor kita.

---

## 2. Metaplex Core — Standar Baru NFT/Asset

### Penjelasan Teknis

Metaplex Core adalah standar NFT generasi baru yang menggantikan Token Metadata (standar lama). Perbedaan utamanya:

| Aspek | Token Metadata (Lama) | Core (Baru) |
|-------|----------------------|-------------|
| Jumlah account | 3-5 account per NFT | **1 account** per NFT |
| Biaya mint | ~0.022 SOL | **~0.0037 SOL** (80% lebih murah) |
| Plugin system | Tidak ada | **Ada** (extensible) |
| Royalty enforcement | Opsional | **Enforced** |

### Analogi Awam

Token Metadata itu seperti bikin KTP di era lama — kamu harus ke 3-5 kantor berbeda, masing-masing bikin dokumen sendiri. **Metaplex Core** itu seperti bikin e-KTP — semua data ada di **satu chip**, lebih murah, lebih cepat, dan bisa ditambahi fitur (plugin) tanpa ganti kartu.

### Konsep Kunci

- **Asset**: Satu account di blockchain yang merepresentasikan satu aset digital (bisa NFT, bisa identitas agent)
- **Collection**: Pengelompokan beberapa Asset (misal: semua agent kita masuk satu collection)
- **Plugin**: Fitur tambahan yang bisa dipasang ke Asset — seperti royalty, freeze, attribute, dll

### Code Preview — Membuat Core Asset

```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { generateSigner, keypairIdentity } from '@metaplex-foundation/umi';
import { create, mplCore } from '@metaplex-foundation/mpl-core';

// 1. Setup Umi (koneksi ke Solana)
const umi = createUmi('https://api.devnet.solana.com')
  .use(mplCore());

// 2. Buat signer (keypair baru untuk asset)
const assetSigner = generateSigner(umi);

// 3. Mint Core Asset
const tx = await create(umi, {
  asset: assetSigner,
  name: 'My AI Agent',
  uri: 'https://arweave.net/agent-metadata.json', // metadata JSON
}).sendAndConfirm(umi);

console.log('Asset address:', assetSigner.publicKey);
console.log('Tx signature:', tx.signature);
```

### Code Preview — Membuat Collection + Asset dengan Plugin

```typescript
import { createCollection, create, ruleSet } from '@metaplex-foundation/mpl-core';

// Buat Collection dulu
const collectionSigner = generateSigner(umi);
await createCollection(umi, {
  collection: collectionSigner,
  name: 'Agent Network',
  uri: 'https://arweave.net/collection-metadata.json',
}).sendAndConfirm(umi);

// Buat Asset di dalam Collection, dengan plugin Attributes
const agentSigner = generateSigner(umi);
await create(umi, {
  asset: agentSigner,
  name: 'Research Agent',
  uri: 'https://arweave.net/research-agent.json',
  collection: collectionSigner.publicKey,
  plugins: [
    {
      type: 'Attributes',
      attributeList: [
        { key: 'role', value: 'researcher' },
        { key: 'version', value: '1.0.0' },
        { key: 'a2a_endpoint', value: 'https://myagent.com/.well-known/agent-card.json' },
      ],
    },
  ],
}).sendAndConfirm(umi);
```

---

## 3. Umi — "Remote Control" Universal Metaplex

### Penjelasan Teknis

Umi adalah framework JavaScript zero-dependency dari Metaplex. Ia menyediakan **interface universal** untuk berinteraksi dengan semua program Metaplex di Solana. Sifatnya modular — kamu pilih plugin yang kamu butuhkan.

### Analogi Awam

Umi itu seperti **remote TV universal**. Kamu punya banyak "program Metaplex" (TV, AC, sound system) — daripada pegang 5 remote berbeda, kamu pakai satu remote universal (Umi) yang bisa kontrol semuanya. Mau tambah fitur? Tinggal pasang plugin baru.

### Arsitektur

```
┌────────────────────────────────────┐
│           Kode Kamu (TS)           │
└──────────────┬─────────────────────┘
               │
┌──────────────▼─────────────────────┐
│              UMI                    │
│  ┌─────────┐ ┌─────────┐ ┌──────┐ │
│  │mpl-core │ │ genesis │ │ ... │  │
│  │ plugin  │ │ plugin  │ │     │  │
│  └─────────┘ └─────────┘ └──────┘ │
└──────────────┬─────────────────────┘
               │
┌──────────────▼─────────────────────┐
│         Solana Blockchain          │
└────────────────────────────────────┘
```

### Code Preview — Setup Umi

```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { keypairIdentity } from '@metaplex-foundation/umi';

// Setup dasar
const umi = createUmi('https://api.devnet.solana.com')
  .use(mplCore())              // plugin untuk Core Assets
  .use(keypairIdentity(myKeypair));  // identitas wallet kita

// Sekarang umi bisa dipakai untuk semua operasi Metaplex
// umi.rpc, umi.programs, umi.identity, dll — semua tersedia
```

### Packages yang Dipakai

```bash
npm install @metaplex-foundation/umi \
            @metaplex-foundation/umi-bundle-defaults \
            @metaplex-foundation/mpl-core \
            @metaplex-foundation/mpl-toolbox
```

---

## 4. Metaplex Agent Registry — KTP Digital untuk AI Agent

### Penjelasan Teknis

Agent Registry adalah sistem di mana AI agent di-register **onchain** sebagai Metaplex Core Asset. Setiap agent mendapat:

1. **Onchain Identity** — Core Asset sebagai "KTP" agent
2. **Wallet Sendiri** — Address Solana untuk menerima/kirim crypto
3. **Metadata** — Informasi tentang kemampuan agent (capability, endpoint, dll)
4. **Discoverability** — Agent lain bisa "menemukan" agent ini di blockchain

### Analogi Awam

Bayangkan kamu punya asisten AI. Untuk bisa kerja di "kota Solana", asisten itu butuh:
- **KTP** (Core Asset) — bukti identitas yang tercatat resmi
- **Rekening bank** (Wallet) — supaya bisa terima bayaran
- **Kartu nama** (Agent Card) — supaya orang/agent lain tahu dia bisa apa
- **Terdaftar di Yellow Pages** (Registry) — supaya bisa ditemukan

Agent Registry = **proses bikin semua itu sekaligus**.

### Bagaimana Agent Direpresentasikan

```
┌───────────────────────────────────────────┐
│           METAPLEX CORE ASSET             │
│                                           │
│  Name: "Research Agent v1"                │
│  URI:  https://arweave.net/metadata.json  │
│                                           │
│  Plugins:                                 │
│  ├── Attributes:                          │
│  │   ├── role: "researcher"               │
│  │   ├── a2a_endpoint: "https://..."      │
│  │   ├── x402_enabled: "true"             │
│  │   └── version: "1.0.0"                 │
│  │                                        │
│  └── [Custom plugins...]                  │
│                                           │
│  Owner: <agent-wallet-address>            │
└───────────────────────────────────────────┘
```

### Code Preview — Register Agent

```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { generateSigner, keypairIdentity } from '@metaplex-foundation/umi';
import { create, mplCore } from '@metaplex-foundation/mpl-core';
import { Keypair } from '@solana/web3.js';

// Setup
const umi = createUmi('https://api.devnet.solana.com').use(mplCore());

// Agent wallet — ini wallet yang agent akan pakai untuk transaksi
const agentKeypair = Keypair.generate();

// Register agent sebagai Core Asset
const agentAsset = generateSigner(umi);

await create(umi, {
  asset: agentAsset,
  name: 'MetaResearcher Agent',
  uri: 'https://arweave.net/agent-metadata.json',
  plugins: [
    {
      type: 'Attributes',
      attributeList: [
        { key: 'agent_type', value: 'researcher' },
        { key: 'agent_wallet', value: agentKeypair.publicKey.toBase58() },
        { key: 'a2a_card_url', value: 'https://myagent.com/.well-known/agent-card.json' },
        { key: 'x402_endpoint', value: 'https://myagent.com/api/service' },
        { key: 'capabilities', value: 'research,analysis,summarize' },
        { key: 'price_per_request', value: '0.001 USDC' },
      ],
    },
  ],
}).sendAndConfirm(umi);

console.log('Agent registered! Asset:', agentAsset.publicKey);
console.log('Agent wallet:', agentKeypair.publicKey.toBase58());
```

### Metadata JSON (di-upload ke Arweave/IPFS)

```json
{
  "name": "MetaResearcher Agent",
  "description": "AI agent yang melakukan riset dan analisis data dari berbagai sumber",
  "image": "https://arweave.net/agent-avatar.png",
  "properties": {
    "agent_wallet": "5Gh7...abc",
    "capabilities": ["research", "analysis", "summarization"],
    "a2a_endpoint": "https://myagent.com/.well-known/agent-card.json",
    "x402_pricing": {
      "research_query": "0.001 USDC",
      "full_analysis": "0.01 USDC"
    },
    "version": "1.0.0"
  }
}
```

---

## 5. x402 Protocol — Sistem Bayar Otomatis Antar Mesin

### Penjelasan Teknis

x402 adalah protokol pembayaran berbasis HTTP 402 ("Payment Required"). Ia memungkinkan **API endpoint minta bayar dulu sebelum kasih respons**. Dikembangkan Coinbase, sekarang sudah adopted luas di Solana.

Statistik:
- 35M+ transaksi di Solana
- Biaya per transaksi: ~$0.00025
- Finality: ~400ms (hampir instan)

### Analogi Awam

Bayangkan kamu pesan makanan di restoran:

1. Kamu bilang ke pelayan: "Saya mau nasi goreng" (HTTP Request)
2. Pelayan bilang: "Harganya Rp25.000, bayar dulu ya" (HTTP 402 + harga)
3. Kamu bayar (kirim crypto)
4. Pelayan kasih nasi goreng (HTTP 200 + data)

**x402 = versi digital otomatis dari proses ini.** Bedanya, yang pesan dan bayar bisa mesin/AI agent, bukan manusia. Jadi agent A bisa "beli jasa" dari agent B tanpa campur tangan manusia.

### Flow Diagram

```
  Agent A (Client)              Agent B (Server)
       │                              │
       │── GET /api/analyze ─────────>│
       │                              │
       │<── 402 Payment Required ─────│
       │    Header: PAYMENT-REQUIRED  │
       │    {amount: 0.001 USDC,      │
       │     payTo: "agent-B-wallet"} │
       │                              │
       │── Sign & Send Payment ──────>│ (onchain)
       │                              │
       │── GET /api/analyze ─────────>│
       │    Header: X-PAYMENT         │
       │    {signature: "tx-sig"}     │
       │                              │
       │<── 200 OK ──────────────────│
       │    {result: "analysis..."}   │
```

### Code Preview — x402 Server (Express.js)

```typescript
import express from 'express';
import { paymentMiddleware } from '@x402/express';

const app = express();

// Middleware x402 — otomatis return 402 jika belum bayar
app.use('/api/agent-service', paymentMiddleware({
  scheme: 'exact',
  price: '$0.001',             // harga per request
  network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', // devnet
  payTo: 'AGENT_WALLET_ADDRESS',
  description: 'AI Research Service',
  mimeType: 'application/json',
}));

// Route yang dilindungi x402
app.get('/api/agent-service', async (req, res) => {
  // Kalau sampai sini = sudah bayar!
  const result = await performAIAnalysis(req.query);
  res.json({ success: true, result });
});

app.listen(3001, () => console.log('Agent service running on :3001'));
```

### Code Preview — x402 Client (Agent yang Bayar)

```typescript
import { Connection, Keypair, Transaction } from '@solana/web3.js';

async function callPaidService(agentWallet: Keypair, serviceUrl: string) {
  // Step 1: Request ke service
  const response = await fetch(serviceUrl);

  if (response.status === 402) {
    // Step 2: Parse payment requirement
    const paymentRequired = JSON.parse(
      atob(response.headers.get('PAYMENT-REQUIRED')!)
    );

    console.log(`Harus bayar: ${paymentRequired.maxAmountRequired} USDC`);
    console.log(`Ke wallet: ${paymentRequired.payTo}`);

    // Step 3: Buat dan sign transaksi pembayaran
    const paymentTx = await createPaymentTransaction(
      agentWallet,
      paymentRequired.payTo,
      paymentRequired.maxAmountRequired
    );

    // Step 4: Kirim ulang request dengan bukti bayar
    const paidResponse = await fetch(serviceUrl, {
      headers: {
        'X-PAYMENT': btoa(JSON.stringify({
          x402Version: 2,
          scheme: 'exact',
          network: paymentRequired.network,
          payload: {
            signature: paymentTx.signature,
            transaction: paymentTx.serialized,
          }
        }))
      }
    });

    return await paidResponse.json();
  }

  return await response.json();
}
```

### Code Preview — x402 dengan Next.js

```typescript
// app/api/research/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withX402 } from '@x402/next';

const handler = async (req: NextRequest) => {
  const query = req.nextUrl.searchParams.get('q');
  const result = await doResearch(query);
  return NextResponse.json({ result });
};

// Wrap handler dengan x402 — otomatis handle payment flow
export const GET = withX402(handler, {
  accepts: [{
    scheme: 'exact',
    price: '$0.001',
    network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    payTo: process.env.AGENT_WALLET!,
  }],
  description: 'AI Research Query',
  mimeType: 'application/json',
});
```

---

## 6. A2A (Agent-to-Agent) — Agent Ngobrol & Kerja Sama

### Penjelasan Teknis

A2A (Agent2Agent) adalah protokol open-source dari Google (sekarang di Linux Foundation) untuk komunikasi standar antar AI agent. Menggunakan JSON-RPC 2.0 over HTTP.

Komponen utama:
- **Agent Card**: "Kartu nama" digital berisi capability agent
- **Task**: Unit kerja yang dikirim dari satu agent ke agent lain
- **Message**: Pesan bolak-balik dalam sebuah task
- **Discovery**: Cara agent menemukan agent lain

### Analogi Awam

Bayangkan marketplace freelancer seperti Fiverr:

- **Agent Card** = Profil freelancer (nama, skill, harga, portfolio)
- **Discovery** = Kamu search "desainer logo" dan menemukan freelancer
- **Task** = Kamu order jasa: "Buatkan logo untuk brand saya"
- **Message** = Chat bolak-balik selama pengerjaan: "Ini draftnya" → "Ubah warnanya" → "Done!"
- **x402 Payment** = Pembayaran otomatis setelah jasa selesai

**A2A = Fiverr, tapi yang jual dan beli jasa adalah AI agent, bukan manusia.** Dan semuanya otomatis.

### Agent Card (Kartu Nama Digital)

Setiap agent mempublikasikan Agent Card di URL standar:

```
https://my-agent.com/.well-known/agent-card.json
```

```json
{
  "protocolVersion": "0.3.0",
  "name": "Research Agent",
  "description": "AI agent untuk riset dan analisis data",
  "version": "1.0.0",
  "url": "https://my-agent.com/a2a",
  "capabilities": ["streaming"],
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": ["text/plain", "application/json"],
  "skills": [
    {
      "name": "research-topic",
      "description": "Riset mendalam tentang topik tertentu",
      "inputSchema": {
        "type": "object",
        "properties": {
          "topic": { "type": "string" },
          "depth": { "type": "string", "enum": ["shallow", "medium", "deep"] }
        },
        "required": ["topic"]
      }
    },
    {
      "name": "analyze-data",
      "description": "Analisis data dan hasilkan insight",
      "inputSchema": {
        "type": "object",
        "properties": {
          "data": { "type": "string" },
          "format": { "type": "string" }
        }
      }
    }
  ]
}
```

### Code Preview — A2A Server (Agent yang Menyediakan Jasa)

```typescript
import express from 'express';

const app = express();
app.use(express.json());

// Serve Agent Card
app.get('/.well-known/agent-card.json', (req, res) => {
  res.json({
    protocolVersion: '0.3.0',
    name: 'Research Agent',
    description: 'Melakukan riset mendalam',
    url: 'https://my-agent.com/a2a',
    skills: [
      {
        name: 'research-topic',
        description: 'Riset topik tertentu',
        inputSchema: {
          type: 'object',
          properties: { topic: { type: 'string' } },
        },
      },
    ],
  });
});

// Handle A2A requests (JSON-RPC 2.0)
app.post('/a2a', async (req, res) => {
  const { method, params, id } = req.body;

  if (method === 'message/send') {
    const userMessage = params.message.parts[0].text;

    // Proses request dengan AI
    const result = await processWithLLM(userMessage);

    // Kirim response A2A
    res.json({
      jsonrpc: '2.0',
      id,
      result: {
        taskId: params.taskId || crypto.randomUUID(),
        message: {
          role: 'agent',
          parts: [{ type: 'text', text: result }],
        },
      },
    });
  }
});

app.listen(3002, () => console.log('A2A Agent running on :3002'));
```

### Code Preview — A2A Client (Agent yang Minta Jasa)

```typescript
// Agent A menemukan dan berkomunikasi dengan Agent B

async function discoverAndCallAgent(agentUrl: string, task: string) {
  // Step 1: Discover — ambil Agent Card
  const cardResponse = await fetch(`${agentUrl}/.well-known/agent-card.json`);
  const agentCard = await cardResponse.json();

  console.log(`Menemukan agent: ${agentCard.name}`);
  console.log(`Kemampuan: ${agentCard.skills.map(s => s.name).join(', ')}`);

  // Step 2: Kirim task via A2A protocol (JSON-RPC 2.0)
  const taskId = crypto.randomUUID();
  const a2aResponse = await fetch(`${agentCard.url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '1',
      method: 'message/send',
      params: {
        taskId,
        message: {
          role: 'user',
          messageId: crypto.randomUUID(),
          parts: [{ type: 'text', text: task }],
        },
      },
    }),
  });

  const result = await a2aResponse.json();
  return result.result.message.parts[0].text;
}

// Contoh penggunaan
const insight = await discoverAndCallAgent(
  'https://research-agent.com',
  'Analisis tren pasar crypto Q1 2026'
);
console.log('Hasil dari agent lain:', insight);
```

### A2A + x402 (Agent Bayar Agent)

```typescript
// Flow lengkap: Agent A discover → call → bayar → terima hasil dari Agent B

async function a2aWithPayment(
  agentUrl: string,
  task: string,
  myWallet: Keypair
) {
  // 1. Discover agent
  const card = await fetch(`${agentUrl}/.well-known/agent-card.json`)
    .then(r => r.json());

  // 2. Kirim task (mungkin kena 402)
  const response = await fetch(card.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '1',
      method: 'message/send',
      params: {
        taskId: crypto.randomUUID(),
        message: {
          role: 'user',
          parts: [{ type: 'text', text: task }],
        },
      },
    }),
  });

  // 3. Kalau 402 — bayar dulu!
  if (response.status === 402) {
    const paymentReq = JSON.parse(
      atob(response.headers.get('PAYMENT-REQUIRED')!)
    );

    // Sign pembayaran onchain
    const payment = await signPayment(myWallet, paymentReq);

    // Retry dengan bukti bayar
    const paidResponse = await fetch(card.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PAYMENT': btoa(JSON.stringify(payment)),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'message/send',
        params: {
          taskId: crypto.randomUUID(),
          message: {
            role: 'user',
            parts: [{ type: 'text', text: task }],
          },
        },
      }),
    });

    return await paidResponse.json();
  }

  return await response.json();
}
```

---

## 7. Metaplex Genesis — Pabrik Token Launch

### Penjelasan Teknis

Genesis adalah smart contract Metaplex untuk Token Generation Event (TGE) di Solana. Ia menyediakan 3 mekanisme launch yang fair dan terdesentralisasi.

### Analogi Awam

Bayangkan kamu mau **IPO (Initial Public Offering)** saham perusahaanmu. Genesis itu seperti **bursa efek** yang menyediakan 3 cara:

1. **Launch Pool** = "Patungan" — Semua orang setor uang ke satu pool. Setelah periode selesai, token dibagi proporsional sesuai setoran. Harga final ditentukan oleh total setoran. Seperti "siapa yang setor lebih banyak, dapat lebih banyak".

2. **Presale** = "Pre-order dengan harga fixed" — Harga sudah ditentukan. First come first served sampai cap tercapai. Seperti beli tiket konser dengan harga yang sudah pasti.

3. **Uniform Price Auction** = "Lelang" — Orang-orang pasang bid. Setelah periode selesai, semua pemenang bayar harga yang sama (clearing price). Seperti lelang seni di mana semua pemenang bayar harga tertinggi terendah.

### Kenapa Launch Pool Recommended?

- Fair distribution (tidak bisa front-run atau sniping)
- Price discovery otomatis
- Tidak ada "whale advantage"
- Protocol fee cuma 2%

### Code Preview — Launch Token via Genesis

```typescript
// Catatan: API Genesis masih berkembang, ini pattern yang diharapkan
// Cek docs terbaru di developers.metaplex.com/smart-contracts/genesis

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { generateSigner } from '@metaplex-foundation/umi';

const umi = createUmi('https://api.devnet.solana.com');

// 1. Buat token mint
const tokenMint = generateSigner(umi);

// 2. Konfigurasi Launch Pool
const launchPoolConfig = {
  mint: tokenMint,
  name: 'Agent Service Token',
  symbol: 'AST',
  decimals: 9,
  totalSupply: 1_000_000_000, // 1 billion tokens

  // Launch Pool parameters
  launchPool: {
    depositCap: 100_000,       // max 100K USDC total deposits
    minDeposit: 1,             // minimum 1 USDC per person
    maxDeposit: 10_000,        // maximum 10K USDC per person
    startTime: Math.floor(Date.now() / 1000) + 3600,  // mulai 1 jam dari sekarang
    endTime: Math.floor(Date.now() / 1000) + 86400,   // berakhir 24 jam dari sekarang
    tokensForSale: 200_000_000, // 200M tokens (20% supply) dijual
  },
};

// 3. Deploy Launch Pool
// (API exact tergantung versi SDK Genesis terbaru)
```

### Token Utility yang Harus Diimplementasi

Untuk hackathon, token HARUS punya **meaningful utility**. Berikut opsi-opsi terkuat:

```typescript
// Contoh: Token sebagai Payment + Access + Staking

interface TokenUtility {
  // 1. PAYMENT — Bayar agent service pakai token
  payment: {
    researchQuery: 10,    // 10 AST per query
    fullAnalysis: 100,    // 100 AST per analysis
    premiumInsight: 500,  // 500 AST per premium insight
  };

  // 2. ACCESS — Hold token untuk unlock fitur
  access: {
    basicTier: 100,       // hold 100 AST = basic access
    proTier: 1000,        // hold 1000 AST = pro features
    enterpriseTier: 10000, // hold 10K AST = enterprise
  };

  // 3. STAKING — Stake token untuk prioritas
  staking: {
    priorityQueue: true,  // staker dapat prioritas di antrian agent
    revenueShare: true,   // staker dapat bagian dari pendapatan agent
    minStake: 500,        // minimum 500 AST untuk stake
  };
}
```

---

## 8. Solana Agent Kit — Toolbox Siap Pakai

### Penjelasan Teknis

Solana Agent Kit (oleh SendAI) adalah toolkit open-source yang menyediakan 60+ fungsi blockchain siap pakai untuk AI agent. Mendukung DeFi, NFT, token operations, dan lainnya.

### Analogi Awam

Kalau Metaplex Core itu bahan mentah (beras, sayur, bumbu), maka **Solana Agent Kit** itu **meal kit** — bahan sudah dipotong, bumbu sudah ditakar, tinggal masak. Kamu tidak perlu implementasi transfer token dari nol, tinggal panggil `agent.transfer()`.

### Code Preview — Inisialisasi Agent

```typescript
import { SolanaAgentKit } from 'solana-agent-kit';

const agent = new SolanaAgentKit(
  process.env.AGENT_PRIVATE_KEY!,     // base58 encoded private key
  'https://api.devnet.solana.com',     // RPC URL
  process.env.OPENAI_API_KEY           // untuk LLM integration
);
```

### Operasi yang Tersedia

```typescript
// Token Operations
await agent.deployToken('Agent Token', 'uri', 'AST', 9, 1_000_000);
await agent.transfer(destinationAddress, 100, tokenMint);
await agent.trade(targetMint, 50, sourceMint, 0.5); // swap

// DeFi Operations
await agent.lendAssets('USDC', 1000);
await agent.stake(10); // stake SOL

// NFT Operations (via Metaplex)
await agent.mintNFT(collectionAddress, metadata);

// Utility
await agent.getBalance();
await agent.requestFaucetFunds(); // devnet only
```

---

## 9. Peta Koneksi Seluruh Ekosistem

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER / FRONTEND                          │
│                    (Next.js + React + TypeScript)                 │
└───────────────────────────┬──────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│                      AGENT RUNTIME (Node.js)                     │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   LLM Layer  │  │ Solana Agent │  │    A2A Server          │ │
│  │  (OpenAI /   │  │    Kit       │  │  (JSON-RPC 2.0)        │ │
│  │  Anthropic)  │  │  (60+ tools) │  │  + Agent Card          │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────────┘ │
│         │                 │                    │                 │
│  ┌──────▼─────────────────▼────────────────────▼───────────────┐ │
│  │                    x402 PAYMENT LAYER                       │ │
│  │         (HTTP 402 middleware — bayar/terima bayar)           │ │
│  └─────────────────────────┬───────────────────────────────────┘ │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     UMI (Universal Interface)                    │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  mpl-core   │  │  genesis    │  │  mpl-toolbox            │ │
│  │  (plugin)   │  │  (plugin)   │  │  (plugin)               │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────────────┘ │
└─────────┼────────────────┼──────────────────┼──────────────────┘
          │                │                  │
┌─────────▼────────────────▼──────────────────▼──────────────────┐
│                    SOLANA BLOCKCHAIN                             │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐ │
│  │ Agent Registry│  │   Genesis     │  │  Custom Program     │ │
│  │ (Core Assets) │  │ (Token Launch)│  │  (Rust/Anchor)      │ │
│  │               │  │               │  │  - Token utility    │ │
│  │ - Agent ID    │  │ - Launch Pool │  │  - Staking logic    │ │
│  │ - Wallet      │  │ - Presale     │  │  - Access control   │ │
│  │ - Metadata    │  │ - Auction     │  │  - Revenue share    │ │
│  └───────────────┘  └───────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. NPM Packages & SDK Lengkap

### Core Packages (Wajib)

```bash
# Metaplex
npm install @metaplex-foundation/umi
npm install @metaplex-foundation/umi-bundle-defaults
npm install @metaplex-foundation/mpl-core
npm install @metaplex-foundation/mpl-toolbox

# Solana
npm install @solana/web3.js

# x402 (pilih sesuai framework)
npm install @x402/next        # untuk Next.js
npm install @x402/express     # untuk Express.js
npm install x402-solana       # core x402 untuk Solana
```

### Optional Packages (Recommended)

```bash
# Agent toolkit
npm install solana-agent-kit

# A2A (jika ada package resmi, atau implementasi manual)
# npm install a2a-x402

# Agent Registry (ERC-8004 adapter)
# npm install 8004-solana-ts

# AI/LLM
npm install openai            # atau @anthropic-ai/sdk
```

### Dev Dependencies

```bash
npm install -D typescript @types/node
npm install -D vitest          # testing
npm install -D anchor-cli      # jika pakai Rust program
```

---

## Ringkasan: Apa yang Harus Kamu Tahu

| Komponen | Fungsi | Analogi |
|----------|--------|---------|
| **Metaplex** | Infrastruktur digital asset di Solana | Kantor catatan sipil + notaris |
| **Core** | Standar NFT baru (1 account, murah) | e-KTP (semua data dalam 1 chip) |
| **Umi** | Framework universal untuk semua Metaplex SDK | Remote TV universal |
| **Agent Registry** | Daftarkan AI agent di blockchain | Buat KTP + rekening + kartu nama |
| **x402** | Protokol bayar otomatis via HTTP | Bayar di restoran (pesan → bayar → terima) |
| **A2A** | Protokol komunikasi antar agent | Marketplace freelancer (Fiverr) |
| **Genesis** | Launch token secara fair | IPO di bursa efek |
| **Solana Agent Kit** | Toolkit 60+ fungsi blockchain | Meal kit (bahan siap masak) |

---

*Dokumen ini dibuat untuk hackathon Trends.fun x Solana x402 — Metaplex Agents Track.*
*Last updated: April 2026*
