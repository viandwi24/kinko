import { Hono } from 'hono'

export const agentCardRoute = new Hono()

agentCardRoute.get('/agent-card.json', (c) => {
  return c.json({
    protocolVersion: '0.3.0',
    name: 'Kinko Agent A',
    description: 'AI agent funded by Solana staking yield. Orchestrates other agents via A2A.',
    version: '1.0.0',
    url: `${process.env.AGENT_A_URL ?? 'http://localhost:3001'}/api/a2a`,
    capabilities: ['streaming'],
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain', 'application/json'],
    skills: [
      {
        name: 'chat',
        description: 'AI analysis and conversation, funded by user yield treasury',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            userWallet: { type: 'string' },
          },
          required: ['query', 'userWallet'],
        },
      },
    ],
  })
})
