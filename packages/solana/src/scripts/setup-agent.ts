/**
 * setup-agent.ts
 *
 * Creates Kinko Agent as an MPL Core asset, registers identity, registers the
 * operator wallet as an Executive, and delegates execution to it.
 *
 * Can be run standalone:  bun run packages/solana/src/scripts/setup-agent.ts
 * Or imported directly:   import { setupAgent } from './setup-agent'
 *
 * Env vars read from process.env:
 *   OPERATOR_PRIVATE_KEY  — JSON byte array (required)
 *   SOLANA_RPC_URL        — default: https://api.devnet.solana.com
 *   AGENT_SERVICE_URL     — default: http://localhost:3001
 */

import { generateSigner } from '@metaplex-foundation/umi'
import { create, findAssetSignerPda } from '@metaplex-foundation/mpl-core'
import {
  registerIdentityV1,
  findAgentIdentityV1Pda,
  safeFetchAgentIdentityV1,
} from '@metaplex-foundation/mpl-agent-registry/dist/src/generated/identity'
import {
  registerExecutiveV1,
  delegateExecutionV1,
  findExecutiveProfileV1Pda,
} from '@metaplex-foundation/mpl-agent-registry/dist/src/generated/tools'
import { createKinkoUmi } from '../umi'

export type SetupAgentResult = {
  assetAddress: string
  assetSignerPda: string
  agentIdentityPda: string
  executiveProfilePda: string
}

export async function setupAgent(): Promise<SetupAgentResult> {
  const serviceUrl = process.env.AGENT_SERVICE_URL ?? 'http://localhost:3001'
  const agentName  = process.env.AGENT_NAME ?? 'Kinko'
  const umi = createKinkoUmi()
  const operator = umi.identity.publicKey

  console.log('Operator (executive) wallet:', operator)
  console.log('RPC:', umi.rpc.getEndpoint?.() ?? 'devnet')
  console.log('Agent name:', agentName)
  console.log('')

  // ─── 1. Create Core Asset ────────────────────────────────────────────────────
  console.log('Creating Core Asset for Kinko Agent...')

  const assetSigner = generateSigner(umi)

  await create(umi, {
    asset: assetSigner,
    name: agentName,
    uri: `${serviceUrl}/.well-known/metadata.json`,
    plugins: [
      {
        type: 'Attributes',
        attributeList: [
          { key: 'status',            value: 'active' },
          { key: 'total_requests',    value: '0' },
          { key: 'total_yield_spent', value: '0' },
          { key: 'service_endpoint',  value: `${serviceUrl}/api/chat` },
          { key: 'version',           value: '1.0.0' },
        ],
      },
    ],
  }).sendAndConfirm(umi)

  const assetAddress = assetSigner.publicKey
  console.log('  Asset address:         ', assetAddress)

  // ─── 2. Derive Asset Signer PDA ──────────────────────────────────────────────
  const assetSignerPdaTuple = findAssetSignerPda(umi, { asset: assetAddress })
  console.log('  Asset Signer PDA:      ', assetSignerPdaTuple[0])

  // ─── 3. Register Agent Identity ──────────────────────────────────────────────
  console.log('\nRegistering agent identity...')

  // Use the server's /.well-known/agent.json URL directly — embedding JSON inline
  // as a data URI exceeds Solana's 1232-byte transaction limit.
  const registrationUri = `${serviceUrl}/.well-known/agent.json`

  await registerIdentityV1(umi, {
    asset: assetAddress,
    agentRegistrationUri: registrationUri,
  }).sendAndConfirm(umi)

  const agentIdentityPdaTuple = findAgentIdentityV1Pda(umi, { asset: assetAddress })
  console.log('  Agent Identity PDA:    ', agentIdentityPdaTuple[0])

  // ─── 4. Register Executive Profile ───────────────────────────────────────────
  console.log('\nRegistering executive profile...')

  const executiveProfilePdaTuple = findExecutiveProfileV1Pda(umi, { authority: operator })

  const existing = await umi.rpc.getAccount(executiveProfilePdaTuple[0])
  if (existing.exists) {
    console.log('  Executive profile already exists — skipping.')
  } else {
    await registerExecutiveV1(umi, { payer: umi.payer }).sendAndConfirm(umi)
    console.log('  Executive Profile PDA: ', executiveProfilePdaTuple[0])
  }

  // ─── 5. Delegate Execution ────────────────────────────────────────────────────
  console.log('\nDelegating execution to operator...')

  await delegateExecutionV1(umi, {
    agentAsset: assetAddress,
    agentIdentity: agentIdentityPdaTuple,
    executiveProfile: executiveProfilePdaTuple,
  }).sendAndConfirm(umi)

  console.log('  Delegation complete.')

  // ─── Verify ───────────────────────────────────────────────────────────────────
  const identity = await safeFetchAgentIdentityV1(umi, agentIdentityPdaTuple)
  console.log('\nIdentity registered:', identity !== null)

  return {
    assetAddress:       String(assetAddress),
    assetSignerPda:     String(assetSignerPdaTuple[0]),
    agentIdentityPda:   String(agentIdentityPdaTuple[0]),
    executiveProfilePda: String(executiveProfilePdaTuple[0]),
  }
}

// ── Standalone entry point ────────────────────────────────────────────────────
if (import.meta.main) {
  setupAgent()
    .then((r) => {
      console.log('\n═══════════════════════════════════════════════════════════')
      console.log('Done — save these addresses:')
      console.log('')
      console.log(`AGENT_ASSET_ADDRESS=${r.assetAddress}`)
      console.log(`AGENT_SIGNER_PDA=${r.assetSignerPda}`)
      console.log(`AGENT_IDENTITY_PDA=${r.agentIdentityPda}`)
      console.log(`EXECUTIVE_PROFILE_PDA=${r.executiveProfilePda}`)
      console.log('═══════════════════════════════════════════════════════════\n')
    })
    .catch((err) => {
      console.error('Error:', err?.message ?? String(err))
      if (err?.logs?.length) {
        console.error('\nTransaction logs:')
        for (const line of err.logs) console.error(' ', line)
      } else if (err?.cause?.logs?.length) {
        console.error('\nTransaction logs:')
        for (const line of err.cause.logs) console.error(' ', line)
      }
      process.exit(1)
    })
}
