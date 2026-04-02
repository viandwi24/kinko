# Dev Environment Setup

## Struktur Services

```
apps/server/    → Backend utama / API (port 3001)
apps/agent-b/   → Price oracle agent (port 3002)
apps/web/       → Frontend Next.js (port 3000)
contract/       → Anchor smart contract (Solana devnet)
packages/solana/ → Scripts setup onchain (run sekali)
```

---

## Step 1 — Install Dependencies

```bash
bun install
```

---

## Step 2 — Siapkan Keypair

Server butuh keypair Solana. Kalau belum punya, buat dulu:

```bash
solana-keygen new --outfile /tmp/agent-keypair.json
```

Convert ke format env (JSON byte array):

```bash
cat /tmp/agent-keypair.json | tr -d '\n'
# output: [1,2,3,...] → copy ini ke AGENT_PRIVATE_KEY
```

Untuk operator (setup agen onchain), bisa pakai keypair yang sama atau berbeda:

```bash
cat /tmp/agent-keypair.json | tr -d '\n'
# copy ke OPERATOR_PRIVATE_KEY
```

Pastikan ada SOL devnet di keypair tersebut:

```bash
solana airdrop 2 $(solana-keygen pubkey /tmp/agent-keypair.json) --url devnet
```

---

## Step 3 — Setup Onchain Agent (sekali saja)

Jalankan script setup untuk buat MPL Core Asset sebagai identitas agen:

```bash
# Buat file env dulu
cat > packages/solana/.env << 'EOF'
SOLANA_RPC_URL=https://api.devnet.solana.com
OPERATOR_PRIVATE_KEY=[1,2,3,...]   # ganti dengan hasil Step 2
AGENT_SERVICE_URL=http://localhost:3001
EOF

bun run packages/solana/src/scripts/setup-agent.ts
```

Script ini output beberapa alamat — **simpan outputnya**:

```
AGENT_ASSET_ADDRESS=...
AGENT_SIGNER_PDA=...
```

---

## Step 4 — Buat File .env

### `apps/server/.env`

```env
# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
ANCHOR_PROGRAM_ID=aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL

# Keypair agent (JSON byte array dari Step 2)
AGENT_PRIVATE_KEY=[1,2,3,...]

# Dari output Step 3
AGENT_A_ASSET_ADDRESS=

# LLM
OPENAI_API_KEY=sk-...

# Server
PORT=3001
FRONTEND_URL=http://localhost:3000
AGENT_B_URL=http://localhost:3002

# Cost per request (default 0.001 SOL = 1000000 lamports)
COST_PER_REQUEST_LAMPORTS=1000000
```

### `apps/agent-b/.env`

```env
SOLANA_RPC_URL=https://api.devnet.solana.com

# Pubkey (base58) wallet Agent B — penerima x402 payment
# Bisa sama dengan AGENT_SIGNER_PDA dari Step 3, atau buat keypair baru
AGENT_B_WALLET=

PORT=3002
```

### `apps/web/.env.local`

```env
NEXT_PUBLIC_AGENT_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_ANCHOR_PROGRAM_ID=aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL

# Dari output Step 3
NEXT_PUBLIC_AGENT_ASSET_ADDRESS=
```

---

## Step 5 — Jalankan Semua Services

Buka **3 terminal terpisah** atau pakai tmux:

```bash
# Terminal 1 — Server (API utama)
bun run dev:server

# Terminal 2 — Agent B (price oracle)
bun run dev:agent-b

# Terminal 3 — Frontend
bun run dev:web
```

Atau sekaligus (output tercampur):

```bash
bun run dev:server & bun run dev:agent-b & bun run dev:web
```

---

## Step 6 — Verifikasi

Cek semua service running:

```bash
# Server health
curl http://localhost:3001/health
# → {"status":"ok","agent":"kinko"}

# Server agent card
curl http://localhost:3001/.well-known/agent-card.json

# Agent B health
curl http://localhost:3002/health

# Agent B card
curl http://localhost:3002/.well-known/agent-card.json
```

Frontend buka di browser: http://localhost:3000

---

## Step 7 — Test Fungsionalitas

### 1. Connect Wallet
- Buka http://localhost:3000/app/chat
- Connect Phantom (pastikan network = Devnet)

### 2. Deposit SOL ke Treasury
- Di panel kiri, masukkan jumlah SOL (misal `0.5`)
- Klik **Deposit** → approve di Phantom
- Tunggu beberapa detik, stats akan update

### 3. Test Chat
- Ketik pesan di chat (misal: "Hello, what is Kinko?")
- Server akan deduct yield dari treasury, kirim ke LLM, return response
- Muncul badge yield receipt di bawah response

### 4. Test A2A Price Query
- Ketik: "What is the current SOL price?"
- Server akan auto-hire Agent B via x402
- Response berisi harga SOL realtime dari Jupiter API

### 5. Cek Treasury Stats
- Buka http://localhost:3000/app/settings
- Lihat principal, yield tersisa, total spent

---

## Troubleshooting

| Problem | Solusi |
|---------|--------|
| `AGENT_PRIVATE_KEY env var is not set` | Tambahkan key ke `apps/server/.env` |
| `InsufficientYield` saat chat | Deposit lebih SOL ke treasury |
| Phantom tidak muncul di Connect | Pastikan Phantom extension installed, network = Devnet |
| Chat 402 error | Treasury belum ada atau yield 0 — deposit dulu |
| Agent B 402 loop | Cek `AGENT_B_WALLET` sudah diisi di env |
| Hydration error di browser | Sudah di-fix dengan `dynamic ssr:false` — pastikan pakai versi terbaru |

---

## Reset / Fresh Start

Kalau mau reset treasury onchain (devnet):
- Treasury PDA terikat ke wallet address — pakai wallet berbeda untuk fresh start
- Atau airdrop devnet SOL lagi dan deposit ulang

Kalau mau re-deploy agent identity:
```bash
bun run packages/solana/src/scripts/setup-agent.ts
# Update AGENT_A_ASSET_ADDRESS di semua .env
```
