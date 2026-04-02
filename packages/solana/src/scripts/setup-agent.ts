/**
 * Phase 2 — setup-agent.ts
 *
 * Creates Agent A as an MPL Core asset, registers identity, registers the
 * operator wallet as an Executive, and delegates execution to it.
 *
 * Run: bun run packages/solana/src/scripts/setup-agent.ts
 *
 * Env vars (optional — falls back to defaults):
 *   SOLANA_RPC_URL       — default: https://api.devnet.solana.com
 *   SOLANA_KEYPAIR_PATH  — default: ~/.config/solana/id.json
 *   AGENT_SERVICE_URL    — default: http://localhost:3001
 */

import { generateSigner } from '@metaplex-foundation/umi';
import { create, findAssetSignerPda } from '@metaplex-foundation/mpl-core';
import {
  registerIdentityV1,
  findAgentIdentityV1Pda,
  safeFetchAgentIdentityV1,
} from '@metaplex-foundation/mpl-agent-registry/dist/src/generated/identity';

import {
  registerExecutiveV1,
  delegateExecutionV1,
  findExecutiveProfileV1Pda,
} from '@metaplex-foundation/mpl-agent-registry/dist/src/generated/tools';

import { createKinkoUmi } from '../umi';

const SERVICE_URL = process.env.AGENT_SERVICE_URL ?? 'http://localhost:3001';

async function main() {
  const umi = createKinkoUmi();
  const operator = umi.identity.publicKey;

  console.log('Operator (executive) wallet:', operator);
  console.log('RPC:', umi.rpc.getEndpoint?.() ?? 'devnet');
  console.log('');

  // ─── 1. Create Core Asset for Agent A ───────────────────────────────────────
  console.log('Creating Core Asset for Agent A...');

  const assetSigner = generateSigner(umi);

  await create(umi, {
    asset: assetSigner,
    name: 'Kinko',
    uri: 'https://kinko.app/agent.json',
    plugins: [
      {
        type: 'Attributes',
        attributeList: [
          { key: 'status',            value: 'active' },
          { key: 'total_requests',    value: '0' },
          { key: 'total_yield_spent', value: '0' },
          { key: 'service_endpoint',  value: `${SERVICE_URL}/api/chat` },
          { key: 'version',           value: '1.0.0' },
        ],
      },
    ],
  }).sendAndConfirm(umi);

  const assetAddress = assetSigner.publicKey;
  console.log('  Asset address:         ', assetAddress);

  // ─── 2. Derive Asset Signer PDA (agent wallet) ──────────────────────────────
  const assetSignerPda = findAssetSignerPda(umi, { asset: assetAddress });
  console.log('  Asset Signer PDA:      ', assetSignerPda[0]);

  // ─── 3. Register Agent Identity ─────────────────────────────────────────────
  console.log('\nRegistering agent identity...');

  const registrationDoc = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'Kinko',
    description:
      'An autonomous AI agent funded by Solana staking yield. Users deposit SOL into a personal treasury; yield pays for AI requests. Agent A handles chat requests and delegates to specialist agents via x402 A2A payments.',
    image: 'https://kinko.app/agent-a-avatar.png',
    services: [
      {
        name: 'A2A',
        endpoint: `${SERVICE_URL}/.well-known/agent.json`,
        version: '0.3.0',
      },
      {
        name: 'web',
        endpoint: `${SERVICE_URL}/api/chat`,
      },
    ],
    active: true,
    registrations: [
      {
        agentId: assetAddress,
        agentRegistry: 'solana:101:metaplex',
      },
    ],
    supportedTrust: ['crypto-economic'],
  };

  // For hackathon: embed registration doc as a data URI to avoid needing Arweave upload
  const registrationUri = `data:application/json;base64,${Buffer.from(JSON.stringify(registrationDoc)).toString('base64')}`;

  await registerIdentityV1(umi, {
    asset: assetAddress,
    agentRegistrationUri: registrationUri,
  }).sendAndConfirm(umi);

  const agentIdentityPda = findAgentIdentityV1Pda(umi, { asset: assetAddress });
  console.log('  Agent Identity PDA:    ', agentIdentityPda[0]);

  // ─── 4. Register Executive Profile (one-time per operator wallet) ────────────
  console.log('\nRegistering executive profile...');

  const executiveProfilePda = findExecutiveProfileV1Pda(umi, { authority: operator });

  // Check if already registered to avoid error on re-runs
  const existing = await umi.rpc.getAccount(executiveProfilePda[0]);
  if (existing.exists) {
    console.log('  Executive profile already exists — skipping.');
  } else {
    await registerExecutiveV1(umi, {
      payer: umi.payer,
    }).sendAndConfirm(umi);
    console.log('  Executive Profile PDA: ', executiveProfilePda[0]);
  }

  // ─── 5. Delegate Execution ────────────────────────────────────────────────────
  console.log('\nDelegating execution to operator...');

  await delegateExecutionV1(umi, {
    agentAsset: assetAddress,
    agentIdentity: agentIdentityPda,
    executiveProfile: executiveProfilePda,
  }).sendAndConfirm(umi);

  console.log('  Delegation complete.');

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Phase 2 complete — save these addresses:');
  console.log('');
  console.log(`AGENT_ASSET_ADDRESS=${assetAddress}`);
  console.log(`AGENT_SIGNER_PDA=${assetSignerPda[0]}`);
  console.log(`AGENT_IDENTITY_PDA=${agentIdentityPda[0]}`);
  console.log(`EXECUTIVE_PROFILE_PDA=${executiveProfilePda[0]}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Verify identity is registered
  const identity = await safeFetchAgentIdentityV1(umi, agentIdentityPda);
  console.log('Identity registered:', identity !== null);
}

main().catch((err) => {
  // Print message first
  console.error('Error:', err?.message ?? String(err));

  // If it's a SendTransactionError, print the simulation logs — these are the most useful
  if (err?.logs?.length) {
    console.error('\nTransaction logs:');
    for (const line of err.logs) {
      console.error(' ', line);
    }
  } else if (err?.cause?.logs?.length) {
    console.error('\nTransaction logs:');
    for (const line of err.cause.logs) {
      console.error(' ', line);
    }
  }

  process.exit(1);
});
