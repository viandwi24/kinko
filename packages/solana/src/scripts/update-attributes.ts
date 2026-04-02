/**
 * update-attributes.ts
 *
 * Updates the Attributes plugin on Kinko Agent's Core asset.
 * Called by the agent backend after each request.
 *
 * Usage (as module):
 *   import { updateAgentAttributes } from './update-attributes.js'
 *   await updateAgentAttributes(assetAddress, { total_requests: '42', total_yield_spent: '10000000' })
 *
 * Usage (as script):
 *   AGENT_ASSET_ADDRESS=<addr> ATTR_KEY=total_requests ATTR_VALUE=42 bun run update-attributes.ts
 */

import { publicKey } from '@metaplex-foundation/umi';
import { fetchAsset, updatePlugin } from '@metaplex-foundation/mpl-core';
import { createKinkoUmi } from '../umi';

export type AgentAttributes = Partial<{
  status: string;
  total_requests: string;
  total_yield_spent: string;
  service_endpoint: string;
  version: string;
}>;

export async function updateAgentAttributes(
  assetAddress: string,
  updates: AgentAttributes,
) {
  const umi = createKinkoUmi();
  const asset = await fetchAsset(umi, publicKey(assetAddress));

  const existing: Record<string, string> = {};
  const attrs = (asset as any).attributes?.attributeList ?? [];
  for (const { key, value } of attrs) {
    existing[key] = value;
  }

  const merged = { ...existing, ...updates };
  const attributeList = Object.entries(merged).map(([key, value]) => ({ key, value }));

  await updatePlugin(umi, {
    asset: publicKey(assetAddress),
    plugin: {
      type: 'Attributes',
      attributeList,
    },
  }).sendAndConfirm(umi);

  console.log('Attributes updated:', merged);
}

// ─── Script entry point ──────────────────────────────────────────────────────
if (import.meta.main ?? process.argv[1] === new URL(import.meta.url).pathname) {
  const assetAddress = process.env.AGENT_ASSET_ADDRESS;
  const key = process.env.ATTR_KEY;
  const value = process.env.ATTR_VALUE;

  if (!assetAddress || !key || !value) {
    console.error('Usage: AGENT_ASSET_ADDRESS=<addr> ATTR_KEY=<key> ATTR_VALUE=<value> bun run update-attributes.ts');
    process.exit(1);
  }

  updateAgentAttributes(assetAddress, { [key]: value } as AgentAttributes)
    .then(() => process.exit(0))
    .catch((err) => { console.error(err); process.exit(1); });
}
