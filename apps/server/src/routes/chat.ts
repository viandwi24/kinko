import { Hono } from 'hono'
import { llmService } from '../services/llm.js'
import { checkAndDeductYield, getTreasuryInfo } from '../services/treasury.js'
import { updateAgentStats } from '../services/attributes.js'
import { config } from '../config.js'

export const chatRoute = new Hono()

const LAMPORTS_PER_SOL = 1_000_000_000

/** GET /api/treasury/:wallet — check user's yield balance */
chatRoute.get('/treasury/:wallet', async (c) => {
  const wallet = c.req.param('wallet')
  const info = await getTreasuryInfo(wallet)
  if (!info) {
    return c.json({ error: 'Treasury not found for this wallet' }, 404)
  }
  return c.json(info)
})

/** POST /api/chat — main AI service, deducts yield before responding */
chatRoute.post('/chat', async (c) => {
  const body = await c.req.json<{ query: string; userWallet: string; model?: string }>()

  if (!body.query || !body.userWallet) {
    return c.json({ error: 'query and userWallet are required' }, 400)
  }
  const model = body.model ?? undefined

  // 1. Deduct yield from user's treasury PDA
  let deductResult: Awaited<ReturnType<typeof checkAndDeductYield>>
  try {
    deductResult = await checkAndDeductYield(
      body.userWallet,
      config.costPerRequestLamports
    )
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
    if (message.includes('not found') || message.includes('AccountNotFound')) {
      return c.json(
        { error: 'treasury_not_found', message: 'No treasury found for this wallet. Initialize one first.' },
        404
      )
    }
    console.error('[treasury] deduct error:', message)
    return c.json({ error: 'treasury_error', message }, 500)
  }

  // 2. Call LLM
  let result: string
  try {
    result = await llmService.chat(body.query, model)
  } catch (err: unknown) {
    console.error('[llm] error:', err)
    return c.json({ error: 'llm_error', message: 'AI service failed' }, 500)
  }

  // 3. Update agent attributes onchain (non-blocking — don't fail the request if this errors)
  updateAgentStats(config.costPerRequestLamports).catch((err) => {
    console.error('[attributes] update failed (non-fatal):', err)
  })

  // 4. Return response
  return c.json({
    result,
    model: model ?? config.aiModel,
    yield_spent: Number(deductResult.yieldSpentLamports) / LAMPORTS_PER_SOL,
    remaining_yield: Number(deductResult.remainingYieldLamports) / LAMPORTS_PER_SOL,
    tx_hash: deductResult.txHash,
    agent: 'kinko',
  })
})
