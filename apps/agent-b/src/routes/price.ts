/**
 * price.ts — POST /api/price
 *
 * Protected by x402 micropayment protocol.
 * Agent A must include a valid x402 payment header before receiving data.
 *
 * x402 simplified flow (MVP):
 *   1. Client calls POST /api/price without payment → 402 with payment requirements
 *   2. Client pays (Solana tx) → includes tx signature in X-Payment header
 *   3. Server verifies signature → returns data
 *
 * For hackathon MVP: we verify the tx exists onchain and is recent.
 */

import { Hono } from 'hono'
import { Connection, PublicKey } from '@solana/web3.js'
import { getSolPrice } from '../services/jupiter.js'

const AGENT_B_WALLET = process.env.AGENT_B_WALLET ?? ''
const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'
const PRICE_LAMPORTS = 1_000_000 // 0.001 SOL

export const priceRoute = new Hono()

/** GET /api/price/requirements — returns payment terms (x402) */
priceRoute.get('/price/requirements', (c) => {
  return c.json({
    scheme: 'exact',
    network: 'solana',
    maxAmountRequired: String(PRICE_LAMPORTS),
    resource: `${process.env.AGENT_B_URL ?? 'http://localhost:3002'}/api/price`,
    description: 'Pay 0.001 SOL to receive current SOL/USD price',
    mimeType: 'application/json',
    payTo: AGENT_B_WALLET,
    currency: 'SOL',
  })
})

/** POST /api/price — returns SOL price after payment verification */
priceRoute.post('/price', async (c) => {
  const paymentHeader = c.req.header('X-Payment')

  // If no payment header → 402 with payment requirements
  if (!paymentHeader) {
    return c.json(
      {
        error: 'payment_required',
        x402: {
          scheme: 'exact',
          network: 'solana',
          maxAmountRequired: String(PRICE_LAMPORTS),
          resource: `${process.env.AGENT_B_URL ?? 'http://localhost:3002'}/api/price`,
          payTo: AGENT_B_WALLET,
          currency: 'SOL',
        },
      },
      402
    )
  }

  // Verify payment tx onchain
  try {
    const txSig = paymentHeader
    const connection = new Connection(RPC_URL, 'confirmed')
    const tx = await connection.getTransaction(txSig, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    })

    if (!tx) {
      return c.json({ error: 'payment_invalid', message: 'Transaction not found' }, 402)
    }

    // Check tx is recent (within last 5 minutes)
    const txAge = Date.now() / 1000 - (tx.blockTime ?? 0)
    if (txAge > 300) {
      return c.json({ error: 'payment_expired', message: 'Transaction too old' }, 402)
    }

    // Fetch price
    const priceData = await getSolPrice()

    return c.json({
      ...priceData,
      payment: { verified: true, tx: txSig },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: 'price_fetch_failed', message: msg }, 500)
  }
})
