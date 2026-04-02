# Test Scenario 0 — Normal Case (Dev / Devnet)

**Environment:** Development — Devnet
**Tujuan:** Verifikasi full flow dari setup sampai chat berhasil berjalan tanpa error.

---

## Pre-conditions

- Phantom wallet extension terpasang di browser
- Phantom di-switch ke **Devnet** (`Settings → Developer Settings → Devnet`)
- OpenRouter API key sudah ada (`https://openrouter.ai/keys`)
- Bun terinstall (`bun --version`)

---

## Step 1 — Setup Environment

```bash
bun install
bun run setup
```

Di TUI:
1. Pilih **Development — Devnet**
2. Pilih **Generate keypair baru** → catat pubkey yang muncul
3. Tekan `a` untuk airdrop 2 SOL ke agent wallet → tunggu "✓ Airdrop berhasil"
4. Services: biarkan semua tercentang → Enter
5. Isi field:
   - `OPENROUTER_API_KEY` → paste API key
   - `AI_MODEL` → Enter (default `openai/gpt-4o-mini`)
   - Semua field lain → Enter (default sudah benar untuk devnet)
6. Tunggu registrasi Metaplex selesai → "✓ Agent berhasil didaftarkan"
7. Catat `AGENT_ASSET_ADDRESS` yang muncul

**Expected:** TUI selesai tanpa error, file `.env` terbuat di semua service.

---

## Step 2 — Jalankan Services

Buka 3 terminal:

```bash
# Terminal 1
bun run dev:server

# Terminal 2
bun run dev:agent-b

# Terminal 3
bun run dev:web
```

**Expected:**
- Terminal 1: `Kinko server running on port 3001`
- Terminal 2: server running port 3002
- Terminal 3: Next.js ready on `http://localhost:3000`

---

## Step 3 — Verifikasi Services

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","agent":"kinko"}

curl http://localhost:3002/health
# Expected: {"status":"ok"} atau sejenisnya

curl http://localhost:3001/.well-known/agent-card.json
# Expected: JSON dengan name "Kinko", services array
```

---

## Step 4 — Siapkan Phantom Wallet

1. Buka `https://faucet.solana.com`
2. Paste alamat Phantom wallet (bukan agent keypair)
3. Request **1 SOL** devnet
4. Verifikasi balance di Phantom: muncul ~1 SOL

**Expected:** Phantom wallet punya SOL devnet untuk deposit.

---

## Step 5 — Connect Wallet di Frontend

1. Buka `http://localhost:3000`
2. Klik **Launch App** atau navigasi ke `/app/chat`
3. Klik **Connect Wallet** → pilih Phantom → Approve
4. Wallet address muncul di navbar (format `xxxx…xxxx`)

**Expected:** Wallet terhubung, treasury panel muncul di kiri (status: "No treasury found").

---

## Step 6 — Deposit SOL ke Treasury

1. Di treasury panel kiri, isi amount: `0.1`
2. Klik **Deposit**
3. Phantom popup muncul → klik **Approve**
4. Tunggu 3–5 detik
5. Treasury panel update otomatis

**Expected:**
- Phantom tidak error
- Treasury panel menampilkan:
  - Principal locked: `0.1000 SOL`
  - Available yield: `0.000xxx SOL` (kecil, baru mulai)
  - Staking APY: `~8%`

---

## Step 7 — Chat Basic

1. Di chat panel, ketik: `Hello, what is Kinko?`
2. Tekan **Enter** atau klik send

**Expected:**
- Pesan user muncul di bubble kanan
- Loading skeleton muncul sebentar
- Response dari Kinko muncul di bubble kiri
- Di bawah response ada badge:
  - Model: `openai/gpt-4o-mini`
  - `−0.000001 SOL` (yield deducted)
  - `0.000xxx left` (sisa yield)
  - Link `tx` ke Solana Explorer

---

## Step 8 — Chat dengan Custom Model

1. Di input model (atas textarea), ketik: `google/gemini-2.0-flash`
2. Ketik pesan: `Explain Solana staking in one sentence.`
3. Tekan Enter

**Expected:**
- Response muncul
- Badge model menampilkan `google/gemini-2.0-flash`

---

## Step 9 — Chat Price Query (A2A)

1. Kosongkan model input (kembali ke default)
2. Ketik: `What is the current SOL price?`
3. Tekan Enter

**Expected:**
- Response berisi angka harga SOL dalam USD
- Di terminal server ada log `[a2a]` yang menunjukkan request ke Agent B
- Yield badge muncul seperti biasa

---

## Step 10 — Cek Dashboard & Settings

1. Klik tab **Dashboard** di navbar
   - **Expected:** Tampil status agent "active", versi, endpoint, A2A info

2. Klik tab **Settings** di navbar
   - **Expected:**
     - Treasury section: principal 0.1 SOL, APY ~8%
     - Deposit estimator: isi `0.1` SOL → muncul estimasi yield/tahun
     - Onchain Addresses: ada `AGENT_ASSET_ADDRESS` yang bisa di-copy

---

## Pass Criteria

| # | Check | Status |
|---|-------|--------|
| 1 | Setup TUI selesai tanpa error | ☐ |
| 2 | Semua 3 services running | ☐ |
| 3 | `/health` endpoint return OK | ☐ |
| 4 | Wallet connect berhasil | ☐ |
| 5 | Deposit SOL → treasury panel update | ☐ |
| 6 | Chat basic → response + yield badge | ☐ |
| 7 | Custom model → badge sesuai | ☐ |
| 8 | Price query → response ada angka USD | ☐ |
| 9 | Dashboard tampil data agent | ☐ |
| 10 | Settings tampil treasury + addresses | ☐ |

Semua ☐ harus ✓ sebelum dianggap MVP siap demo.
