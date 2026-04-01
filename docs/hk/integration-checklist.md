# Integration Checklist — Metaplex Agents Track

Berdasarkan requirements resmi dari Metaplex (sumber: Twitter/X @metaplex).

> Builders are evaluated by **overall product quality** but required to use Metaplex in **one or more** of the following ways.

---

## Requirement 1 — Create & Register an Agent on Solana

> Register an agent on Solana using Metaplex. This gives your agent an onchain wallet, identity and ability to expose an x402 compatible API so your agent can receive crypto payments for services.

- [ ] Agent terdaftar di Metaplex Agent Registry
- [ ] Agent punya onchain wallet (identity)
- [ ] Agent expose x402 compatible API (bisa menerima crypto payment)
- [ ] Agent runtime connected dan funded

Docs: https://developers.metaplex.com/agents/register-agent
Docs: https://developers.metaplex.com/agents/run-an-agent

---

## Requirement 2 — Demonstrate A2A Interactions

> Demonstrate interesting A2A interactions between agent wallets.

- [ ] Minimal 2 agent wallets
- [ ] Interaksi antar agent yang "interesting" (bukan dummy)
- [ ] Transaksi antar agent wallets (verifiable onchain)

---

## Requirement 3 — Launch a Token + Meaningful Utility

> Use the agent wallet to launch a token with Metaplex's genesis protocol.
> Launch a token for your agent and create meaningful token utility.

- [ ] Token dilaunched oleh **agent wallet** (bukan personal wallet)
- [ ] Pakai Metaplex Genesis protocol
- [ ] Token punya meaningful utility (tidak cukup hanya launched)

Docs: https://developers.metaplex.com/tokens/launch-token

---

## Submission

- [ ] X (Twitter) article menjelaskan build
- [ ] Link ke GitHub repo
- [ ] Link ke live build/demo

---

## Catatan

- Ketiga requirement di atas adalah **OR** — cukup implementasi satu atau lebih
- Penilaian utama tetap pada **overall product quality**
- "Interesting" dan "meaningful" tidak didefinisikan secara spesifik — terserah interpretasi builder
