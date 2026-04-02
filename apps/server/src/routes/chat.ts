import { Hono } from 'hono'
import { llmService } from '../services/llm.js'
import { checkAndDeductYield, getTreasuryInfo } from '../services/treasury.js'
import { updateAgentStats } from '../services/attributes.js'
import { config } from '../config.js'
import { getAuthWallet } from './auth.js'
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'

export const chatRoute = new Hono()

const LAMPORTS_PER_SOL = 1_000_000_000
const X402_PAYMENT_LAMPORTS = 10_000 // 0.00001 SOL per machine request

/** GET /api/treasury/:wallet — check user's yield balance */
chatRoute.get('/treasury/:wallet', async (c) => {
  const wallet = c.req.param('wallet')
  const info = await getTreasuryInfo(wallet)
  if (!info) {
    return c.json({ error: 'Treasury not found for this wallet' }, 404)
  }
  return c.json(info)
})

/** POST /api/chat — main AI service
 *
 * Auth paths (checked in order):
 *  1. Authorization: Bearer <jwt>  →  human user, deduct from yield treasury
 *  2. X-Payment: <txSig>           →  machine/A2A caller, pay per-request via x402
 *  3. Neither                      →  return 402 with requirements for both paths
 */
chatRoute.post('/chat', async (c) => {
  const body = await c.req.json<{ query: string; userWallet?: string; model?: string }>()

  if (!body.query) {
    return c.json({ error: 'query is required' }, 400)
  }
  const model = body.model ?? undefined

  // ── Path A: JWT (human user via frontend) ────────────────────────────────
  const jwtWallet = await getAuthWallet(c)
  if (jwtWallet) {
    // JWT is valid — use jwt wallet, ignore body.userWallet entirely
    return handleYieldChat(c, jwtWallet, body.query, model)
  }

  // ── Path B: X-Payment header (machine/A2A caller) ────────────────────────
  const paymentHeader = c.req.header('X-Payment')
  if (paymentHeader) {
    return handleX402Chat(c, body.query, model, paymentHeader)
  }

  // ── Neither — return 402 with dual requirements ───────────────────────────
  return c.json(
    {
      error: 'payment_required',
      message: 'Authenticate via JWT (human) or x402 micropayment (machine).',
      auth: {
        human: {
          method: 'Bearer JWT',
          flow: 'GET /api/auth/nonce → sign message → POST /api/auth/login → use token',
        },
      },
      x402: {
        payTo: config.agentKeypair.publicKey.toBase58(),
        maxAmountRequired: String(X402_PAYMENT_LAMPORTS),
        asset: 'SOL',
        network: 'solana-devnet',
        description: `Pay ${X402_PAYMENT_LAMPORTS} lamports per request`,
      },
    },
    402
  )
})

// ─── Handler: yield-funded chat (human user) ─────────────────────────────────

async function handleYieldChat(
  c: any,
  userWallet: string,
  query: string,
  model: string | undefined
) {
  let deductResult: Awaited<ReturnType<typeof checkAndDeductYield>>
  try {
    deductResult = await checkAndDeductYield(userWallet, config.costPerRequestLamports)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('InsufficientYield') || message.includes('6001')) {
      return c.json(
        {
          error: 'insufficient_yield',
          message: 'Not enough yield accrued yet. Deposit more SOL or wait for yield to accumulate.',
        },
        402
      )
    }
    if (
      message.includes('not found') ||
      message.includes('AccountNotFound') ||
      message.includes('Account does not exist') ||
      message.includes('has no data')
    ) {
      return c.json(
        { error: 'treasury_not_found', message: 'No treasury found for this wallet. Deposit SOL first to create your treasury.' },
        404
      )
    }
    console.error('[treasury] deduct error:', message)
    return c.json({ error: 'treasury_error', message }, 500)
  }

  let result: string
  try {
    result = await llmService.chat(query, model)
  } catch (err: unknown) {
    console.error('[llm] error:', err)
    return c.json({ error: 'llm_error', message: 'AI service failed' }, 500)
  }

  updateAgentStats(config.costPerRequestLamports).catch((err) => {
    console.error('[attributes] update failed (non-fatal):', err)
  })

  return c.json({
    result,
    model: model ?? config.aiModel,
    yield_spent: Number(deductResult.yieldSpentLamports) / LAMPORTS_PER_SOL,
    remaining_yield: Number(deductResult.remainingYieldLamports) / LAMPORTS_PER_SOL,
    tx_hash: deductResult.txHash,
    agent: 'kinko',
    auth: 'jwt',
  })
}

// ─── Handler: x402 micropayment chat (machine/A2A caller) ────────────────────

async function handleX402Chat(
  c: any,
  query: string,
  model: string | undefined,
  paymentTxSig: string
) {
  // Verify the payment transaction exists on-chain
  try {
    const connection = new Connection(config.rpcUrl, 'confirmed')
    const tx = await connection.getTransaction(paymentTxSig, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    })
    if (!tx) {
      return c.json({ error: 'payment_not_found', message: 'Transaction not found on-chain' }, 402)
    }
    if (tx.meta?.err) {
      return c.json({ error: 'payment_failed', message: 'Transaction failed on-chain' }, 402)
    }
  } catch (err) {
    console.error('[x402] tx verification error:', err)
    return c.json({ error: 'payment_verification_failed', message: 'Could not verify payment' }, 402)
  }

  let result: string
  try {
    result = await llmService.chat(query, model)
  } catch (err: unknown) {
    console.error('[llm] error:', err)
    return c.json({ error: 'llm_error', message: 'AI service failed' }, 500)
  }

  return c.json({
    result,
    model: model ?? config.aiModel,
    payment_tx: paymentTxSig,
    agent: 'kinko',
    auth: 'x402',
  })
}
