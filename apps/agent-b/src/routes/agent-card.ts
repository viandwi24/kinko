import { Hono } from 'hono'

const AGENT_B_URL = process.env.AGENT_B_URL ?? 'http://localhost:3002'

export const agentCardRoute = new Hono()

agentCardRoute.get('/agent-card.json', (c) => {
  return c.json({
    protocolVersion: '0.3.0',
    name: 'Kinko Price Oracle',
    description: 'Provides real-time SOL/USD price data from Jupiter. Protected by x402 micropayment.',
    version: '1.0.0',
    url: `${AGENT_B_URL}/api/price`,
    capabilities: ['x402'],
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['application/json'],
    skills: [
      {
        name: 'sol-price',
        description: 'Returns current SOL/USD price from Jupiter aggregator',
        payment: {
          protocol: 'x402',
          amount: '1000000', // 0.001 SOL in lamports
          currency: 'SOL',
        },
        inputSchema: {
          type: 'object',
          properties: {},
        },
        outputSchema: {
          type: 'object',
          properties: {
            price: { type: 'number', description: 'SOL/USD price' },
            source: { type: 'string' },
            timestamp: { type: 'number' },
          },
        },
      },
    ],
  })
})
