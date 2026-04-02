import { Hono } from 'hono'
import { llmService } from '../services/llm'

export const chatRoute = new Hono()

chatRoute.post('/chat', async (c) => {
  const body = await c.req.json<{ query: string; userWallet: string }>()

  if (!body.query || !body.userWallet) {
    return c.json({ error: 'query and userWallet are required' }, 400)
  }

  // TODO Phase 1: check + deduct yield from user Treasury PDA
  // const yield = await treasuryService.checkAndDeduct(body.userWallet, COST_PER_REQUEST)

  const result = await llmService.chat(body.query)

  return c.json({
    result,
    yield_spent: 0, // TODO: real value after Phase 1
    remaining_yield: 0, // TODO: real value after Phase 1
    tx_hash: null, // TODO: real tx after Phase 1
    agent: 'kinko-agent-a',
  })
})
