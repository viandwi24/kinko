import { Keypair } from '@solana/web3.js'

function loadKeypairFromEnv(): Keypair {
  const raw = process.env.SERVER_AGENT_PRIVATE_KEY
  if (!raw) {
    throw new Error('SERVER_AGENT_PRIVATE_KEY env var is not set. Add it to your .env file.')
  }
  const bytes = JSON.parse(raw) as number[]
  return Keypair.fromSecretKey(new Uint8Array(bytes))
}

export const config = {
  rpcUrl: process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
  publicRpcUrl: process.env.PUBLIC_RPC_URL ?? process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
  programId: process.env.ANCHOR_PROGRAM_ID ?? 'aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL',
  agentName: process.env.SERVER_AGENT_NAME ?? 'Kinko',
  agentAssetAddress: process.env.SERVER_AGENT_ASSET_ADDRESS ?? '',
  pricesAgentAssetAddress: process.env.KINKO_PRICES_ASSET_ADDRESS ?? '',
  agentServiceUrl: process.env.SERVER_URL ?? 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  /** Cost deducted per chat request: default 0.001 SOL */
  costPerRequestLamports: BigInt(process.env.COST_PER_REQUEST_LAMPORTS ?? String(1_000_000)),
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? '',
  /** OpenRouter model — see https://openrouter.ai/models */
  aiModel: process.env.AI_MODEL ?? 'openai/gpt-4o-mini',
  get agentKeypair(): Keypair {
    return loadKeypairFromEnv()
  },
}
