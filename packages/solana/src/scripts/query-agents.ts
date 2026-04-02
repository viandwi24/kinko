/**
 * query-agents.ts
 *
 * Queries MPL Core agents from DAS API.
 * Used for A2A discovery in Phase 5.
 *
 * Run: HELIUS_API_KEY=<key> bun run query-agents.ts
 */

import { publicKey } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplAgentIdentity, mplAgentTools } from '@metaplex-foundation/mpl-agent-registry';
import { dasApi, type DasApiInterface } from '@metaplex-foundation/digital-asset-standard-api';

type AgentInfo = {
  address: string;
  name: string;
  attributes: Record<string, string>;
  registrationUri?: string;
};

export async function queryAgentsByOwner(ownerAddress: string): Promise<AgentInfo[]> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error('HELIUS_API_KEY is required for DAS API queries');

  const umi = createUmi(`https://devnet.helius-rpc.com/?api-key=${apiKey}`)
    .use(mplCore())
    .use(mplAgentIdentity())
    .use(mplAgentTools())
    .use(dasApi());

  const assets = await (umi.rpc as unknown as DasApiInterface).getAssetsByOwner({ owner: publicKey(ownerAddress) });

  return assets.items
    .filter((a: any) => a.interface === 'MplCoreAsset')
    .map((a: any) => {
      const attrPlugin = a.content?.metadata?.attributes ?? [];
      const attributes: Record<string, string> = {};
      for (const { trait_type, value } of attrPlugin) {
        attributes[trait_type] = value;
      }
      return {
        address: a.id,
        name: a.content?.metadata?.name ?? '',
        attributes,
      };
    })
    .filter((a: AgentInfo) => a.attributes['service_endpoint']);
}

export async function queryAgentsByCollection(collectionAddress: string): Promise<AgentInfo[]> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error('HELIUS_API_KEY is required for DAS API queries');

  const umi = createUmi(`https://devnet.helius-rpc.com/?api-key=${apiKey}`)
    .use(mplCore())
    .use(mplAgentIdentity())
    .use(mplAgentTools())
    .use(dasApi());

  const assets = await (umi.rpc as unknown as DasApiInterface).getAssetsByGroup({
    groupKey: 'collection',
    groupValue: collectionAddress,
  });

  return assets.items
    .filter((a: any) => a.interface === 'MplCoreAsset')
    .map((a: any) => {
      const attrPlugin = a.content?.metadata?.attributes ?? [];
      const attributes: Record<string, string> = {};
      for (const { trait_type, value } of attrPlugin) {
        attributes[trait_type] = value;
      }
      return {
        address: a.id,
        name: a.content?.metadata?.name ?? '',
        attributes,
      };
    })
    .filter((a: AgentInfo) => a.attributes['service_endpoint']);
}

// ─── Script entry point ──────────────────────────────────────────────────────
if (import.meta.main ?? process.argv[1] === new URL(import.meta.url).pathname) {
  const owner = process.env.OWNER_ADDRESS;
  if (!owner) {
    console.error('Usage: OWNER_ADDRESS=<addr> HELIUS_API_KEY=<key> bun run query-agents.ts');
    process.exit(1);
  }

  queryAgentsByOwner(owner)
    .then((agents) => {
      console.log(`Found ${agents.length} agent(s):\n`);
      for (const a of agents) {
        console.log(`  ${a.name} — ${a.address}`);
        console.log(`    service: ${a.attributes['service_endpoint']}`);
        console.log(`    status:  ${a.attributes['status'] ?? 'unknown'}`);
        console.log(`    requests: ${a.attributes['total_requests'] ?? '0'}`);
        console.log('');
      }
    })
    .catch((err) => { console.error(err); process.exit(1); });
}
