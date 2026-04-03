<div align="center">
    <p align="center">
        <a target="_blank">
            <img src="./assets/kinko_logo.svg" alt="Kinko" width="70" height="70">
            <h1 align="center">Kinko</h1>
        </a>
        <p align="center">
            金庫 — The vault seals your SOL. The agent awakens. Neither shall stop.
        </p>
    </p>
</div>

**A self-funding AI agent treasury on Solana. Lock principal, spend only from yield.**

[![Demo](https://img.shields.io/badge/Demo-kinko.viandwi24.com-000)](https://kinko.viandwi24.com)
[![Agent](https://img.shields.io/badge/Metaplex-Agent-blue)](https://www.metaplex.com/agents/49r61vKJVDrvWRv9EnoW5uDWQ4WS4TK8bAXM7U7rkZMq?network=solana-devnet)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF)](https://explorer.solana.com/address/HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt?cluster=devnet)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## Problem

Every AI agent today runs on a pre-funded wallet. Someone manually loads SOL before the demo. The agent looks autonomous — but it is not. When the wallet hits zero, the agent stops.

Worse: giving an agent direct wallet access means one bug, one exploit, or one logic error can drain everything the user deposited. There is no on-chain enforcement preventing it.

| Problem | Description |
|---------|-------------|
| No sustainable budget | Agents need recurring cost coverage — pre-funded wallets drain fast |
| No principal safety | Direct wallet access = agent can drain everything |
| No on-chain enforcement | Off-chain logic can be bypassed; smart contract cannot |
| No user control | No way to set per-request caps or daily limits enforced at contract level |

---

## Solution

Kinko solves this with one mechanism: **lock the principal, spend only from yield.**

Users deposit SOL into a Kinko treasury. The SOL is staked via Marinade Finance and held as mSOL in the treasury PDA. The principal is structurally locked — there is no instruction in the contract that allows the agent to access it. Only the yield (the appreciation of mSOL over time) becomes spendable.

Every AI request is paid from that yield balance, enforced on-chain. If yield runs out, requests are blocked until more accrues. The principal stays intact forever.

| Solution | How |
|----------|-----|
| **Principal locked** | No contract instruction can access `principal_lamports` via agent |
| **Yield-only spending** | `deduct_yield` can only transfer `available_yield = msol_value - principal - spent` |
| **On-chain enforcement** | Per-request cap, daily limit, and pause — all enforced inside Anchor instruction |
| **User controls** | `set_user_settings` and `set_paused` write to contract, not off-chain config |

---

## Architecture

### Monorepo Structure

```
kinko/
├── package.json                    ← Bun workspaces root
├── Cargo.toml                      ← Cargo workspace root
│
├── apps/
│   ├── web/                        ← Next.js frontend (user dashboard + chat)
│   └── server/                     ← Hono backend (AI agent runtime, port 3001)
│       ├── src/
│       │   ├── config.ts           ← env config, agent keypair, program IDs
│       │   ├── index.ts            ← Hono app entrypoint
│       │   ├── routes/
│       │   │   ├── auth.ts         ← SIWS auth: nonce + login + JWT
│       │   │   ├── chat.ts         ← /api/chat + /api/treasury/:wallet
│       │   │   ├── config.ts       ← /api/config + /api/config/admin/stats
│       │   │   ├── agent-card.ts   ← /.well-known/* routes
│       │   │   └── prices.ts       ← /agents/prices/* (Kinko Prices sub-agent)
│       │   └── services/
│       │       ├── treasury.ts     ← yield read + deduct (Simulated + Marinade)
│       │       ├── llm.ts          ← LLM via OpenRouter + A2A skill detection
│       │       ├── a2a.ts          ← agent discovery + x402 payment flow
│       │       └── attributes.ts   ← Metaplex Core Asset attribute updates
│
├── packages/
│   └── solana/                     ← Shared Metaplex/Umi setup scripts
│       └── src/scripts/
│           └── setup-agent.ts      ← register Core Asset + identity on devnet
│
├── contract/
│   └── programs/kinko-treasury/    ← Anchor program (Rust)
│       └── src/
│           ├── lib.rs              ← program entrypoint, all instruction declarations
│           ├── errors.rs           ← KinkoError enum
│           ├── state/
│           │   ├── kinko_config.rs ← KinkoConfig PDA + StakingProvider enum
│           │   └── user_treasury.rs← UserTreasury PDA + yield calculation
│           └── instructions/
│               ├── initialize_config.rs    ← operator init global config
│               ├── set_staking_provider.rs ← operator switch provider
│               ├── initialize.rs           ← user create treasury PDA
│               ├── deposit.rs              ← deposit SOL (Simulated + Marinade)
│               ├── deduct_yield.rs         ← agent spend yield (Simulated + Marinade)
│               ├── set_user_settings.rs    ← user set per-request cap + daily limit
│               ├── set_paused.rs           ← user pause/unpause treasury
│               ├── migrate_treasury_v3.rs  ← V2→V3 in-place migration
│               ├── withdraw_marinade.rs    ← principal withdrawal (Marinade)
│               └── close_treasury.rs       ← close treasury PDA
│
└── scripts/                        ← Operator CLI scripts (TypeScript, run via bun)
    ├── register-agent.ts           ← register Kinko Agent Core Asset
    ├── register-prices-agent.ts    ← register Kinko Prices Core Asset
    ├── program-init-config.ts      ← initialize KinkoConfig PDA (once after deploy)
    ├── program-set-staking-provider.ts ← switch Simulated/Marinade on-chain
    ├── program-sim-yield.ts        ← toggle fast yield for testing
    └── program-migrate-account.ts  ← migrate old treasury layouts
```

---

## On-chain State

### `KinkoConfig` PDA

**Seeds:** `[b"kinko_config"]` — global, one per program deployment.

```rust
pub struct KinkoConfig {
    pub authority: Pubkey,               // operator who initialized
    pub agent: Pubkey,                   // only pubkey allowed to call deduct_yield
    pub staking_provider: StakingProvider, // Simulated(0) | Marinade(1)
    pub bump: u8,
}
```

Set once by operator after deploy. All user treasuries share this config — no per-user agent registration required.

### `UserTreasury` PDA

**Seeds:** `[b"treasury", owner_pubkey]` — one per user wallet.

```rust
pub struct UserTreasury {
    pub owner: Pubkey,                   // wallet that deposited
    pub principal_lamports: u64,         // locked deposit (never touched by agent)
    pub deposit_timestamp: i64,          // unix timestamp of last deposit
    pub total_yield_spent: u64,          // cumulative yield spent (lamports)
    pub msol_amount: u64,                // mSOL held in treasury ATA (Marinade mode)
    pub bump: u8,
    // V3 spending controls (enforced in deduct_yield)
    pub max_per_request_lamports: u64,   // 0 = unlimited
    pub daily_limit_lamports: u64,       // 0 = unlimited
    pub day_spent_lamports: u64,         // spent in current 24h window
    pub day_start_timestamp: i64,        // when current window started
    pub is_paused: bool,                 // if true, all deduct_yield calls fail
}
```

**Account size history:** V1 = 65 bytes → V2 = 73 bytes → V3 = 106 bytes (current). In-place migration instructions exist for both upgrades.

### Yield Calculation

**Simulated mode** (time-based APY):
```
accrued  = principal * YIELD_RATE_BPS(800) * elapsed_seconds / 10_000 / SECONDS_PER_YEAR
available = accrued - total_yield_spent
```

**Marinade mode** (real mSOL exchange rate):
```
msol_value = msol_amount * msol_price_num / msol_price_den   ← from Marinade state account
available  = msol_value - principal_lamports - total_yield_spent
```

Exchange rate parsed directly from Marinade state account bytes (offset 344/352 on devnet).

---

## Two Metaplex Agents

Kinko registers two agents as **Metaplex Core Assets** on Solana devnet. Each has its own on-chain identity and exposes a standard A2A `agent-card.json`.

| Agent | Role |
|-------|------|
| **Kinko Agent** | Primary AI assistant — processes user queries, deducts yield per request |
| **Kinko Prices** | Price oracle sub-agent — returns live Binance prices, paid via x402 |

After every successful chat request, Kinko Agent's Core Asset is updated on-chain via the **Attributes plugin**:
- `total_requests` — incremented by 1
- `total_yield_spent` — cumulative lamports spent
- `last_active` — ISO timestamp

The agent's full activity history is auditable directly from the Metaplex asset.

---

## Flows

### Flow 1: User Deposit (Marinade mode)

```
1. User connects Phantom wallet in frontend
2. Frontend fetches GET /api/config → programId, agentAssetAddress, rpcUrl
3. User enters SOL amount, clicks "Deposit"
4. Frontend signs and sends 2 transactions:

   a. initialize()
      → creates UserTreasury PDA: seeds = [b"treasury", owner.key()]
      → all fields zeroed

   b. deposit_marinade(amount_lamports)
      → CPI to Marinade Finance deposit instruction:
         SOL from owner → Marinade pool → mSOL minted to treasury ATA
         (treasury ATA: associated_token::authority = treasury PDA)
      → treasury.principal_lamports += amount_lamports
      → treasury.msol_amount += msol_received
      → treasury.deposit_timestamp = Clock::get().unix_timestamp

5. Frontend shows updated principal, yield balance, staking provider
```

**Required accounts for `deposit_marinade`:**
```
treasury PDA, kinko_config, owner (signer), msol_mint,
treasury_msol_account (ATA), marinade_state, liq_pool_sol_leg_pda,
liq_pool_msol_leg, liq_pool_msol_leg_authority, reserve_pda,
msol_mint_authority, marinade_program,
token_program, associated_token_program, system_program, rent
```

---

### Flow 2: Human User Chat (JWT path)

```
1. User visits /app/* — AuthProvider auto-triggers SIWS

2. SIWS auth:
   a. GET /api/auth/nonce?wallet=<pubkey>
      → server generates 16-byte random nonce, stores in-memory (5 min TTL)
      → returns { nonce, expiresAt }
   b. Wallet signs message:
      "Sign in to Kinko\n\nWallet: <pubkey>\nNonce: <nonce>\n\n
       This request will not trigger any blockchain transaction..."
   c. POST /api/auth/login { wallet, signature (base64), nonce }
      → server verifies ed25519 signature (nacl.sign.detached.verify)
      → consumes nonce (one-time use)
      → issues JWT: HS256, 24h, payload { wallet, iat, exp }
   d. JWT stored in localStorage["kinko_auth"]

3. User sends chat message

4. POST /api/chat { query, model? }
   Authorization: Bearer <jwt>

5. Server:
   a. getAuthWallet(c) → verify JWT → extract wallet address
   b. checkAndDeductYield(wallet, COST_PER_REQUEST_LAMPORTS):
      → reads UserTreasury + KinkoConfig from chain
      → dispatches to deduct_yield (Simulated) or deduct_yield_marinade (Marinade)
      → on-chain checks (in order):
         1. require!(!treasury.is_paused)
         2. require!(amount <= max_per_request)  if max_per_request > 0
         3. if daily_limit > 0:
              reset window if now - day_start >= 86,400s
              require!(day_spent + amount <= daily_limit)
         4. require!(amount <= available_yield)
      → transfers lamports from treasury PDA to agent wallet
      → updates total_yield_spent, day_spent_lamports
      → returns { txHash, yieldSpentLamports, remainingYieldLamports }
   c. detectPriceQuery(query) → if price keyword found → callSkillViaA2A() (see Flow 4)
   d. llmService.chat(query, model) → OpenRouter API → response text
   e. updateAgentStats(cost) → Metaplex Core Asset Attributes update (async, non-blocking)
   f. Return { result, yield_spent, remaining_yield, tx_hash, auth: "jwt" }
```

**Error responses:**
| Status | Code | Meaning |
|--------|------|---------|
| 402 | `insufficient_yield` | Yield < cost — deposit more or wait |
| 404 | `treasury_not_found` | No treasury for wallet — deposit first |
| 401 | `unauthorized` | JWT expired — re-sign |

---

### Flow 3: Machine / A2A Chat (x402 path)

```
1. External caller: POST /api/chat { query }  (no auth headers)
   ← server returns 402:
   {
     "x402": {
       "payTo": "<agent_keypair_pubkey>",
       "maxAmountRequired": "10000",
       "asset": "SOL",
       "network": "solana-devnet"
     }
   }

2. Caller sends SystemProgram.transfer(10,000 lamports) to payTo
   → records txSig

3. Retry: POST /api/chat { query }
   X-Payment: <txSig>

4. Server:
   a. Detects X-Payment header
   b. connection.getTransaction(txSig, { commitment: "confirmed" })
      → verify tx exists and meta.err === null
   c. llmService.chat(query) → OpenRouter
   d. Return { result, payment_tx: txSig, auth: "x402" }
```

No treasury required. Each request = one independent SOL micropayment.

---

### Flow 4: A2A — Kinko Hiring Kinko Prices

Triggered automatically inside `llmService.chat()` when price keywords are detected.

```
1. detectPriceQuery(query):
   → checks PRICE_KEYWORDS: ["price", "harga", "how much", "berapa", ...]
   → maps to crypto pair: "btc"/"bitcoin" → BTCUSDT, "sol"/"solana" → SOLUSDT, etc.
   → returns { skill: "price", body: { pair: "BTCUSDT" } }

2. discoverAgentsWithSkill("price"):
   a. Primary: KINKO_PRICES_ASSET_ADDRESS env var
      → constructs baseUrl = SERVER_URL/agents/prices
   b. Secondary (if HELIUS_API_KEY set):
      POST helius-rpc/getAssetsByOwner(agent_keypair_pubkey)
      → filter: interface === "MplCoreAsset", skip self
      → read "service_endpoint" attribute from each asset
   c. For each candidate:
      GET <serviceEndpoint>/.well-known/agent-card.json
      → find skill where name includes "price"
      → add to results: { assetAddress, name, skillEndpoint }

3. callAgentWithX402(agent, { pair: "BTCUSDT" }):
   a. POST <skillEndpoint>  (no payment)
      ← 402: { x402: { payTo, maxAmountRequired: "10000" } }
   b. Kinko agent keypair sends:
      SystemProgram.transfer(10,000 lamports → payTo)
      → sendAndConfirmTransaction → txSig
   c. POST <skillEndpoint>
      X-Payment: <txSig>
      ← { symbol: "BTCUSDT", price: 68420.5, source: "Binance API", timestamp: ... }

4. Context injected into LLM prompt:
   '[Real-time data from "Kinko Prices" (<assetAddress[:8]>…) via x402 (tx: <txSig[:12]>…)]
    {"symbol":"BTCUSDT","price":68420.5,"source":"Binance API",...}'

5. LLM answers using live data
6. Response includes agent name + tx hash
```

---

### Flow 5: User Spending Controls

```
1. User opens Settings in frontend
2. User sets limits and clicks Save

3. Frontend sends set_user_settings(max_per_request_lamports, daily_limit_lamports)
   → writes to UserTreasury PDA on-chain
   → pass 0 to disable a limit

4. Enforcement inside deduct_yield (every AI request):
   require!(!is_paused)
   if max_per_request > 0: require!(amount <= max_per_request)
   if daily_limit > 0:
     if now - day_start >= 86_400s: reset day_spent = 0, day_start = now
     require!(day_spent + amount <= daily_limit)
   require!(amount <= available_yield)
   → all checks before any lamport moves
   → if any fails → instruction reverts, no funds transferred

5. To pause all spending:
   set_paused(true) → treasury.is_paused = true
   → every deduct_yield call fails immediately with TreasuryPaused (6007)

6. To unpause:
   set_paused(false)
```

---

### Flow 6: Principal Withdrawal (Marinade)

```
1. User clicks "Withdraw Principal" in frontend
2. Frontend sends withdraw_marinade()
   accounts: treasury PDA, kinko_config, owner (signer), msol_mint,
             treasury_msol_account (ATA), marinade pool accounts..., recipient

3. Contract:
   a. has_one = owner (only the depositor can withdraw)
   b. Reads treasury.msol_amount
   c. CPI to Marinade liquid_unstake(msol_amount):
      → burns all mSOL from treasury ATA
      → SOL sent to recipient (owner wallet)
      → Marinade fee: ~0.3% (deducted automatically)
   d. treasury.principal_lamports = 0
   e. treasury.msol_amount = 0

4. Owner receives SOL minus ~0.3% Marinade unstake fee
5. Treasury PDA remains open (can re-deposit)
```

---

## Anchor Program Reference

**Program ID:** `HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt` (Solana devnet)

**Config PDA:** `X6JGvxeCVxWRvTQ97ixoCmmmZRtYSf4DmtqKGLCNpoA`

| Instruction | Caller | Description |
|-------------|--------|-------------|
| `initialize_config` | Operator | Create global KinkoConfig PDA (once after deploy) |
| `set_staking_provider` | Operator | Switch between Simulated(0) and Marinade(1) |
| `initialize` | User | Create user's treasury PDA |
| `deposit` | User | Deposit SOL — Simulated mode |
| `deposit_marinade` | User | Deposit SOL via Marinade CPI — mSOL mode |
| `deduct_yield` | Agent | Spend yield in SOL — Simulated mode |
| `deduct_yield_marinade` | Agent | Liquid unstake mSOL → SOL — Marinade mode |
| `set_user_settings` | User | Set per-request cap + daily limit |
| `set_paused` | User | Pause or unpause treasury |
| `withdraw_marinade` | User | Unstake all mSOL, return SOL to owner |
| `close_treasury` | User | Close PDA, reclaim rent |
| `migrate_treasury_v3` | User | In-place V2(73B) → V3(106B) migration |

### Error Codes

| Code | Name | Trigger |
|------|------|---------|
| 6000 | `ZeroAmount` | amount = 0 |
| 6001 | `InsufficientYield` | yield < requested amount |
| 6002 | `UnauthorizedAgent` | caller ≠ config.agent |
| 6003 | `InvalidMarinadeState` | Marinade state data invalid |
| 6004 | `InvalidStakingProvider` | wrong provider variant |
| 6005 | `WrongDepositInstruction` | deposit vs deposit_marinade mismatch |
| 6006 | `WrongDeductInstruction` | deduct vs deduct_marinade mismatch |
| 6007 | `TreasuryPaused` | is_paused = true |
| 6008 | `ExceedsPerRequestCap` | amount > max_per_request_lamports |
| 6009 | `ExceedsDailyLimit` | day_spent + amount > daily_limit_lamports |

---

## Server API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/config` | — | Program ID, RPC URL, agent asset addresses |
| `GET` | `/api/config/admin/stats` | — | Aggregate stats across all vaults |
| `GET` | `/api/auth/nonce?wallet=` | — | Request SIWS nonce |
| `POST` | `/api/auth/login` | — | Submit signed nonce → JWT |
| `POST` | `/api/auth/logout` | — | Client-side logout hint |
| `GET` | `/api/treasury/:wallet` | — | Treasury info for a wallet |
| `POST` | `/api/chat` | JWT or X-Payment | AI chat |
| `GET` | `/.well-known/agent.json` | — | ERC-8004 agent metadata |
| `GET` | `/.well-known/agent-card.json` | — | A2A agent card |
| `GET` | `/.well-known/metadata.json` | — | Metaplex NFT metadata |
| `GET` | `/agents/prices/.well-known/agent-card.json` | — | Kinko Prices A2A card |
| `POST` | `/agents/prices/api/price` | X-Payment (10,000 lamports) | Live crypto price |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Language | TypeScript (apps, scripts) + Rust (contract) |
| Package manager | Bun workspaces |
| Anchor | 0.31.x |
| Frontend | Next.js + Tailwind CSS + shadcn/ui |
| Backend | Hono |
| Blockchain | Solana devnet |
| Staking | Marinade Finance (mSOL, liquid staking) |
| Agent identity | Metaplex mpl-core (Core Asset + Attributes plugin) |
| Agent registry | Metaplex Agent Registry (mpl-genesis) |
| Payments | x402-solana protocol |
| Price data | Binance API (via Kinko Prices sub-agent) |
| AI/LLM | OpenRouter API |
| Discovery | Helius DAS API (`getAssetsByOwner`) |

---

## Local Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Rust](https://rustup.rs) + [Anchor CLI](https://www.anchor-lang.com/docs/installation)
- Solana CLI
- Solana devnet wallet with SOL

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp apps/server/.env.example apps/server/.env
```

Fill in `apps/server/.env`:

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
SERVER_AGENT_PRIVATE_KEY=[1,2,3,...]   # JSON byte array
OPENROUTER_API_KEY=sk-or-...
JWT_SECRET=change-this-in-production
SERVER_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Filled automatically by register-prices-agent:
KINKO_PRICES_ASSET_ADDRESS=
# Optional — enables Helius DAS discovery:
HELIUS_API_KEY=
```

### 3. Register agents

```bash
bun run register-agent           # Kinko Agent (main)
bun run register-prices-agent    # Kinko Prices (sub-agent)
```

### 4. Deploy contract

```bash
bun run deploy:contract
```

### 5. Initialize global config (once per deploy)

```bash
bun run program-init-config
```

### 6. Set staking provider

```bash
bun run program-set-staking-provider marinade   # or: simulated | status
```

### 7. Start dev servers

```bash
bun run dev          # all
bun run dev:web      # Next.js :3000
bun run dev:server   # Hono :3001
```

---

## Deployed Addresses (Devnet)

| Resource | Address |
|----------|---------|
| Anchor Program | `HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt` |
| KinkoConfig PDA | `X6JGvxeCVxWRvTQ97ixoCmmmZRtYSf4DmtqKGLCNpoA` |
| Kinko Agent Core Asset | `49r61vKJVDrvWRv9EnoW5uDWQ4WS4TK8bAXM7U7rkZMq` |
| Marinade Program | `MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD` |
| mSOL Mint | `mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So` |

---

## Links

- **Demo:** https://kinko.viandwi24.com
- **GitHub:** https://github.com/viandwi24/kinko
- **Metaplex Agent:** https://www.metaplex.com/agents/49r61vKJVDrvWRv9EnoW5uDWQ4WS4TK8bAXM7U7rkZMq?network=solana-devnet
- **Solana Explorer:** https://explorer.solana.com/address/HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt?cluster=devnet

---

*Built for the Trends.fun × Solana x402 Hackathon — Metaplex Agents Track*

*#AgentTalentShow #Solana #Metaplex #x402*
