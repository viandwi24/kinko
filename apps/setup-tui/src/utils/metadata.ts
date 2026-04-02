import { writeFileSync, mkdirSync } from 'fs'
import { resolveFromRoot } from './env.js'

export type AgentMetadata = {
  type: string
  name: string
  description: string
  image: string
  services: { name: string; endpoint: string; version?: string }[]
  active: boolean
  registrations: { agentId: string; agentRegistry: string }[]
  supportedTrust: string[]
}

/**
 * Generate ERC-8004 compliant agent metadata dan tulis ke data/agent-metadata.json.
 * File ini di-serve oleh server di GET /.well-known/agent.json
 */
export function generateAgentMetadata(serverUrl: string, assetAddress = ''): AgentMetadata {
  const metadata: AgentMetadata = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'Kinko',
    description: '金庫 — The vault seals your SOL. The agent awakens. Neither shall stop.',
    image: `${serverUrl}/logo.png`,
    services: [
      {
        name: 'A2A',
        endpoint: `${serverUrl}/.well-known/agent-card.json`,
        version: '0.3.0',
      },
      {
        name: 'web',
        endpoint: `${serverUrl}/api/chat`,
      },
    ],
    active: true,
    registrations: assetAddress
      ? [{ agentId: assetAddress, agentRegistry: 'solana:101:metaplex' }]
      : [],
    supportedTrust: ['crypto-economic'],
  }

  const dataDir = resolveFromRoot('data')
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(
    resolveFromRoot('data/agent-metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8',
  )

  return metadata
}
