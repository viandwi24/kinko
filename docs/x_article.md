# Kinko — X Article (Submission Draft)

> **Submission rules:**
> - Publish as X Article (not a regular tweet)
> - Quote RT the announcement post
> - Tag @trendsdotfun @solana_devs @metaplex
> - Hashtag: #AgentTalentShow
> - Include link to this article in the Quote RT

---

## Article Content

---

# Kinko: A Self-Funding AI Agent Treasury on Solana

The real problem with AI agents is not capability — it is sustainability.

Every agent demo you see runs on a pre-funded wallet. Someone loaded SOL before the recording. The agent looks autonomous, but when the wallet hits zero, it stops. And giving an agent direct wallet access means one bug or exploit can drain everything the user deposited.

Kinko solves this with one idea: **lock the principal, spend only from yield.**

---

### The Core Mechanism

When a user deposits SOL into Kinko, it is staked via Marinade Finance and held as mSOL in the treasury PDA. The principal is structurally locked inside an Anchor program — there is no instruction in the contract that allows the agent to reach it. Only the yield (the appreciation of mSOL relative to SOL over time) becomes spendable.

Every AI request is paid from that yield balance, enforced onchain. If yield runs out, requests are blocked until more accrues. The principal stays intact. The agent keeps running as long as yield covers the cost.

```
User deposits SOL
      ↓
Anchor program stakes SOL → mSOL via Marinade Finance CPI
      ↓
mSOL appreciates as staking rewards accrue
      ↓
Yield = current mSOL value in SOL − original principal
      ↓
Agent spends yield per request — enforced at contract level
      ↓
Principal: never touched
```

This is not access control. There is no admin key that can be compromised to unlock the principal. The contract simply has no such function.

---

### The Contract: Two PDAs

**`UserTreasury`** (per user, seeds: `[b"treasury", owner_pubkey]`)

Holds the principal, tracks cumulative yield spent, and stores user-configurable spending controls:

- `max_per_request_lamports` — hard cap per single AI request
- `daily_limit_lamports` — rolling 24-hour spending window
- `is_paused` — freeze the treasury instantly

All three are enforced inside `deduct_yield`. The agent cannot bypass them. If a request exceeds the cap, the instruction fails.

**`KinkoConfig`** (global, seeds: `[b"kinko_config"]`)

Stores the authorized agent pubkey and the active staking provider enum (`Simulated` or `Marinade`). One config for all user treasuries — users deposit and start immediately with no per-user agent setup required.

---

### Two Agents, Two Identities on Metaplex

Kinko registers **two agents as Metaplex Core Assets** on Solana. Each has a dedicated onchain identity, its own `agent-card.json` served live, and its own x402-protected endpoint.

**Kinko Agent** — the primary AI assistant. After every successful chat request, the Core Asset is updated onchain via the Attributes plugin. `total_requests` and `total_yield_spent` increment in real time. The agent's entire spending history is auditable directly from the Metaplex asset.

**Kinko Prices** — a specialist price oracle sub-agent. Registered as a separate Core Asset. Exposes a `price` skill in its `agent-card.json`. Returns live cryptocurrency prices from Binance, paid per request via x402 (10,000 lamports per call).

---

### A2A: Agents Hiring Agents

When a user asks Kinko about a crypto price, Kinko does not answer from training data. It discovers the Prices sub-agent through the Metaplex Agent Registry, pays for the data via x402, and uses the live result in its response.

The full flow:

1. Kinko detects a price-related query
2. Helius DAS `getAssetsByOwner` → find Core Assets with a `service_endpoint` attribute
3. Fetch `agent-card.json` from each → confirm the `price` skill is available
4. POST to `/agents/prices/api/price` → 402 response with `payTo` and `maxAmountRequired`
5. Kinko's agent keypair pays 10,000 lamports SOL to the Prices agent wallet
6. Retry with `X-Payment: <txSig>` header
7. Prices agent verifies the tx, returns live Binance data
8. Kinko uses the data in its answer and cites the agent name and tx hash

This is real agent-to-agent commerce. Two registered Metaplex identities, one paying the other, every payment verifiable onchain.

---

### User Control Over the Agent

Kinko gives users onchain control over how much yield the agent can spend. These settings are written directly to the `UserTreasury` contract — not stored off-chain, not a soft limit.

- Set a maximum per request (e.g. 0.0001 SOL) → agent cannot exceed this even if yield is available
- Set a daily limit (e.g. 0.001 SOL per 24h) → rolling window enforced by contract
- Pause the treasury → all agent spending stops immediately

This addresses the underlying trust problem: the user does not need to trust the agent's off-chain logic. The contract enforces the rules regardless.

---

### Why Solana

Marinade's `liquid_unstake` settles in the same transaction as `deduct_yield` — no waiting period, no redemption queue. Per-request micropayments at 10,000 lamports (~$0.001) are economically viable because Solana transaction fees are fractions of a cent.

An agent running this model on Ethereum would spend more on gas than the value of the yield it is distributing. On Solana it works as a real, per-request economic primitive.

---

### What Is Live Today

- Anchor program deployed on Solana devnet
  - Program ID: `HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt`
- Global `KinkoConfig` PDA with Marinade as active staking provider
- Two Metaplex Core Assets registered as agent identities on devnet
- `deduct_yield` enforcing principal lock + per-request cap + daily limit + pause — all onchain
- Kinko Prices sub-agent with live Binance data behind x402
- A2A discovery via Helius DAS + Metaplex Core Asset attributes
- Onchain Attributes update on every successful request (`total_requests`, `total_yield_spent`)
- Frontend dashboard with treasury stats, chat panel, and settings

**Honest scope:** This submission runs on devnet. Marinade staking is active — mSOL yield is the live path. We show what works. We say what is next.

---

### Links

- **GitHub:** https://github.com/viandwi24/kinko
- **Demo:** https://kinko.viandwi24.com
- **Agent (Metaplex):** https://www.metaplex.com/agents/49r61vKJVDrvWRv9EnoW5uDWQ4WS4TK8bAXM7U7rkZMq?network=solana-devnet
- **Contract (Solana Explorer):** https://explorer.solana.com/address/HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt?cluster=devnet

---

*Built for the Trends.fun × Solana x402 Hackathon — Metaplex Agents Track*

*#AgentTalentShow #Solana #Metaplex #x402*

---

## Quote RT Template

> Just submitted Kinko to #AgentTalentShow — a self-funding AI agent treasury on @solana.
>
> Lock principal. Spend only from staking yield. Two @metaplex agents, real A2A payments via x402.
>
> Full story: [link to X Article]
>
> @trendsdotfun @solana_devs @metaplex #AgentTalentShow

---

## Checklist Before Publishing

- [x] Fill in GitHub repo link — https://github.com/viandwi24/kinko
- [x] Fill in live demo URL — https://kinko.viandwi24.com
- [x] Fill in Metaplex agent link — https://www.metaplex.com/agents/49r61vKJVDrvWRv9EnoW5uDWQ4WS4TK8bAXM7U7rkZMq?network=solana-devnet
- [ ] Publish article on X (via X Article, not regular tweet)
- [ ] Quote RT the announcement post with the tags above
- [ ] Confirm Solana Explorer link resolves correctly on devnet
