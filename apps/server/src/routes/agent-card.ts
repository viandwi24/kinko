import { Hono } from 'hono'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { config } from '../config'

const LOGO_PATH = resolve(process.cwd(), '../../assets/kinko_logo.png')

export const agentCardRoute = new Hono()

agentCardRoute.get('/logo.png', (c) => {
  if (!existsSync(LOGO_PATH)) return c.notFound()
  const buf = readFileSync(LOGO_PATH)
  return new Response(buf, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } })
})

// ERC-8004 agent metadata — fully dynamic from env/config
agentCardRoute.get('/agent.json', (c) => {
  const serverUrl = config.agentServiceUrl
  return c.json({
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: config.agentName,
    description:
      'An autonomous AI agent funded by Solana staking yield. Users lock SOL into a personal treasury; staking yield automatically pays for AI requests. Supports multi-model via OpenRouter. Orchestrates specialist agents via A2A x402 micropayments.',
    image: `${serverUrl}/.well-known/logo.png`,
    services: [
      {
        name: 'A2A',
        endpoint: `${serverUrl}/.well-known/agent-card.json`,
        version: '0.3.0',
        skills: ['chat', 'yield-treasury'],
        domains: ['AI', 'DeFi', 'Solana'],
      },
      {
        name: 'web',
        endpoint: config.frontendUrl,
      },
    ],
    active: true,
    registrations: config.agentAssetAddress
      ? [{ agentId: config.agentAssetAddress, agentRegistry: 'solana:101:metaplex' }]
      : [],
    supportedTrust: ['crypto-economic'],
  })
})

// Standard Metaplex/NFT metadata — used as `uri` when minting Core Asset
// Explorer reads: name, description, image, attributes
agentCardRoute.get('/metadata.json', (c) => {
  const serverUrl  = process.env.SERVER_URL ?? 'http://localhost:3001'
  const agentName  = process.env.SERVER_AGENT_NAME ?? 'Kinko'
  const imageUrl   = process.env.SERVER_AGENT_IMAGE_URL ?? `${serverUrl}/logo.png`
  return c.json({
    name: agentName,
    description: '金庫 — The vault seals your SOL. The agent awakens. Neither shall stop.',
    image: imageUrl,
    external_url: serverUrl,
    attributes: [
      { trait_type: 'Type',    value: 'AI Agent' },
      { trait_type: 'Network', value: 'Solana' },
      { trait_type: 'Version', value: '1.0.0' },
    ],
    properties: {
      category: 'agent',
      files: [{ uri: imageUrl, type: 'image/png' }],
    },
  })
})

agentCardRoute.get('/agent-card.json', (c) => {
  const serverUrl = config.agentServiceUrl
  return c.json({
    protocolVersion: '0.3.0',
    name: config.agentName,
    description:
      'An autonomous AI agent funded by Solana staking yield. Users lock SOL; yield pays for AI. Orchestrates specialist agents via A2A x402 micropayments.',
    version: '1.0.0',
    url: `${serverUrl}/api/chat`,
    capabilities: ['x402'],
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['application/json'],
    skills: [
      {
        name: 'chat',
        description: 'AI conversation funded by yield treasury. Requires userWallet with deposited SOL.',
        tags: ['AI', 'DeFi', 'Solana'],
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The user question or task' },
            userWallet: { type: 'string', description: 'User Solana wallet address — yield is deducted from this treasury' },
            model: { type: 'string', description: 'OpenRouter model ID (optional, defaults to server config)' },
          },
          required: ['query', 'userWallet'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string' },
            model: { type: 'string' },
            yield_spent: { type: 'number' },
            remaining_yield: { type: 'number' },
            tx_hash: { type: 'string' },
          },
        },
      },
      {
        name: 'yield-treasury',
        description: 'Query or manage user yield treasury. Returns principal, available yield, and yield spent.',
        tags: ['DeFi', 'Solana', 'treasury'],
        inputSchema: {
          type: 'object',
          properties: {
            wallet: { type: 'string', description: 'User Solana wallet address' },
          },
          required: ['wallet'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            principalSol: { type: 'number' },
            availableYieldSol: { type: 'number' },
            totalYieldSpentSol: { type: 'number' },
          },
        },
      },
    ],
  })
})
