/**
 * attributes.ts — updates the Attributes plugin on Agent A's Core Asset.
 * Called after every successful chat request.
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi'
import { mplCore, fetchAsset, updatePlugin } from '@metaplex-foundation/mpl-core'
import { config } from '../config.js'

function buildUmi() {
  const raw = process.env.AGENT_PRIVATE_KEY
  if (!raw) throw new Error('AGENT_PRIVATE_KEY is not set')
  const bytes = JSON.parse(raw) as number[]

  const umi = createUmi(config.rpcUrl).use(mplCore())
  const kp = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(bytes))
  umi.use(keypairIdentity(kp))
  return umi
}

export async function updateAgentStats(additionalYieldLamports: bigint): Promise<void> {
  if (!config.agentAssetAddress) return // no-op if asset not configured

  const umi = buildUmi()
  const assetAddr = publicKey(config.agentAssetAddress)
  const asset = await fetchAsset(umi, assetAddr)

  const existing: Record<string, string> = {}
  const attrs = (asset as any).attributes?.attributeList ?? []
  for (const { key, value } of attrs) {
    existing[key] = value
  }

  const updated = {
    ...existing,
    total_requests: String((parseInt(existing['total_requests'] ?? '0', 10) || 0) + 1),
    total_yield_spent: String(
      BigInt(existing['total_yield_spent'] ?? '0') + additionalYieldLamports
    ),
    last_active: new Date().toISOString(),
  }

  await updatePlugin(umi, {
    asset: assetAddr,
    plugin: {
      type: 'Attributes',
      attributeList: Object.entries(updated).map(([key, value]) => ({ key, value })),
    },
  }).sendAndConfirm(umi)
}
