/**
 * a2a.ts — Agent-to-Agent: Agent A discovers and hires Agent B via x402.
 *
 * Flow:
 *   1. Discover Agent B via agent card URL (configured via env for MVP)
 *   2. POST /api/price without payment → receive 402 + payment requirements
 *   3. Pay from Asset Signer PDA (via Core Execute) or agent keypair → get tx sig
 *   4. Retry with X-Payment: <txSig> header → receive price data
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import { config } from '../config.js'

const AGENT_B_URL = process.env.AGENT_B_URL ?? 'http://localhost:3002'

export type A2APriceResult = {
  price: number
  source: string
  timestamp: number
  paymentTx: string
}

export async function fetchSolPriceViaA2A(): Promise<A2APriceResult> {
  // Step 1: call Agent B without payment to get 402 + requirements
  const probeRes = await fetch(`${AGENT_B_URL}/api/price`, { method: 'POST' })

  if (probeRes.status !== 402) {
    // Agent B responded directly (e.g. free in dev mode)
    const data = await probeRes.json()
    return { ...data, paymentTx: 'free' }
  }

  const requirements = await probeRes.json()
  const payTo = requirements.x402?.payTo
  const amountLamports = parseInt(requirements.x402?.maxAmountRequired ?? '1000000', 10)

  if (!payTo) throw new Error('Agent B did not provide payTo address in 402 response')

  // Step 2: pay from agent keypair → Agent B wallet
  const agentKeypair = config.agentKeypair
  const connection = new Connection(config.rpcUrl, 'confirmed')

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: agentKeypair.publicKey,
      toPubkey: new PublicKey(payTo),
      lamports: amountLamports,
    })
  )

  const txSig = await sendAndConfirmTransaction(connection, tx, [agentKeypair])

  // Step 3: retry with payment proof
  const paidRes = await fetch(`${AGENT_B_URL}/api/price`, {
    method: 'POST',
    headers: { 'X-Payment': txSig },
  })

  if (!paidRes.ok) {
    const err = await paidRes.json()
    throw new Error(`Agent B payment verification failed: ${err.message}`)
  }

  const priceData = await paidRes.json()
  return {
    price: priceData.price,
    source: priceData.source,
    timestamp: priceData.timestamp,
    paymentTx: txSig,
  }
}
