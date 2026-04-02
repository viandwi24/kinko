import { Keypair } from '@solana/web3.js'

function loadKeypairFromEnv(): Keypair {
  const raw = process.env.AGENT_PRIVATE_KEY
  if (!raw) {
    throw new Error('AGENT_PRIVATE_KEY env var is not set. Add it to your .env file.')
  }
  const bytes = JSON.parse(raw) as number[]
  return Keypair.fromSecretKey(new Uint8Array(bytes))
}

export const config = {
  rpcUrl: process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
  programId: process.env.ANCHOR_PROGRAM_ID ?? 'aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL',
  agentAssetAddress: process.env.AGENT_A_ASSET_ADDRESS ?? '',
  agentServiceUrl: process.env.AGENT_A_URL ?? 'http://localhost:3001',
  /** Cost deducted per chat request: default 0.001 SOL */
  costPerRequestLamports: BigInt(process.env.COST_PER_REQUEST_LAMPORTS ?? String(1_000_000)),
  get agentKeypair(): Keypair {
    return loadKeypairFromEnv()
  },
}
