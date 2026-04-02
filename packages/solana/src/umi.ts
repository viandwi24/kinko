import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { keypairIdentity } from '@metaplex-foundation/umi'
import { mplCore } from '@metaplex-foundation/mpl-core'
import { mplAgentIdentity, mplAgentTools } from '@metaplex-foundation/mpl-agent-registry'
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api'

/**
 * Create a Umi instance for Kinko scripts.
 *
 * Keypair must be supplied via OPERATOR_PRIVATE_KEY env var (JSON byte array).
 * Never use file paths pointing outside the project.
 */
export function createKinkoUmi(rpcEndpoint?: string) {
  const endpoint = rpcEndpoint ?? process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'

  const umi = createUmi(endpoint)
    .use(mplCore())
    .use(mplAgentIdentity())
    .use(mplAgentTools())
    .use(dasApi())

  const raw = process.env.OPERATOR_PRIVATE_KEY
  if (!raw) {
    throw new Error('OPERATOR_PRIVATE_KEY env var is not set. Add it to your .env file.')
  }
  const bytes = JSON.parse(raw) as number[]
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(bytes))
  umi.use(keypairIdentity(keypair))

  return umi
}
