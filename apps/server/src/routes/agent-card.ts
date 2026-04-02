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
    description: '金庫 — The vault seals your SOL. The agent awakens. Neither shall stop.',
    image: `${serverUrl}/.well-known/logo.png`,
    services: [
      { name: 'A2A', endpoint: `${serverUrl}/.well-known/agent-card.json`, version: '0.3.0' },
      { name: 'web', endpoint: config.frontendUrl },
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
  return c.json({
    protocolVersion: '0.3.0',
    name: config.agentName,
    description: `${config.agentName} — 金庫 — The vault seals your SOL. The agent awakens. Neither shall stop.`,
    version: '1.0.0',
    url: `${process.env.SERVER_URL ?? 'http://localhost:3001'}/api/a2a`,
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
