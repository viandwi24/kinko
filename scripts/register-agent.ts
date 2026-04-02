#!/usr/bin/env bun
/**
 * scripts/register-agent.ts
 *
 * Registers the Kinko agent to the Metaplex Agent Registry.
 * Reads env from apps/server/.env, calls setupAgent() directly (no subprocess),
 * then writes the resulting addresses back to apps/server/.env and apps/web/.env.local.
 *
 * Usage: bun run scripts/register-agent.ts
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '..')

function readEnvFile(relPath: string): Record<string, string> {
  const absPath = resolve(ROOT, relPath)
  if (!existsSync(absPath)) return {}
  const result: Record<string, string> = {}
  for (const line of readFileSync(absPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return result
}

function writeEnvFile(relPath: string, values: Record<string, string>): void {
  const absPath = resolve(ROOT, relPath)
  const lines = Object.entries(values).map(([k, v]) => `${k}=${v}`)
  writeFileSync(absPath, lines.join('\n') + '\n', 'utf-8')
}

async function main() {
  const serverEnv = readEnvFile('apps/server/.env')

  if (!serverEnv['SERVER_AGENT_PRIVATE_KEY']) {
    console.error('Error: SERVER_AGENT_PRIVATE_KEY not set in apps/server/.env')
    process.exit(1)
  }
  if (!serverEnv['SOLANA_RPC_URL']) {
    console.error('Error: SOLANA_RPC_URL not set in apps/server/.env')
    process.exit(1)
  }

  // Inject vars into process.env before importing setup-agent
  // Set process.env BEFORE dynamic import — Bun evaluates module at import time
  process.env['OPERATOR_PRIVATE_KEY'] = serverEnv['SERVER_AGENT_PRIVATE_KEY']
  process.env['SOLANA_RPC_URL']       = serverEnv['SOLANA_RPC_URL']
  process.env['AGENT_SERVICE_URL']    = serverEnv['SERVER_URL'] ?? 'http://localhost:3001'
  process.env['AGENT_NAME']           = serverEnv['SERVER_AGENT_NAME'] ?? 'Kinko'

  console.log('RPC         :', process.env['SOLANA_RPC_URL'])
  console.log('Service URL :', process.env['AGENT_SERVICE_URL'])
  console.log('')

  const { setupAgent } = await import('../packages/solana/src/scripts/setup-agent.ts')
  const result = await setupAgent()

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('Done — addresses:')
  console.log(`  AGENT_ASSET_ADDRESS  = ${result.assetAddress}`)
  console.log(`  AGENT_SIGNER_PDA     = ${result.assetSignerPda}`)
  console.log(`  AGENT_IDENTITY_PDA   = ${result.agentIdentityPda}`)
  console.log(`  EXECUTIVE_PROFILE_PDA= ${result.executiveProfilePda}`)
  console.log('═══════════════════════════════════════════════════════════\n')

  // Write SERVER_AGENT_ASSET_ADDRESS back to apps/server/.env
  writeEnvFile('apps/server/.env', { ...serverEnv, SERVER_AGENT_ASSET_ADDRESS: result.assetAddress })
  console.log('Wrote SERVER_AGENT_ASSET_ADDRESS to apps/server/.env')

  // Write NEXT_PUBLIC_SERVER_AGENT_ASSET_ADDRESS to apps/web/.env.local if exists
  if (existsSync(resolve(ROOT, 'apps/web/.env.local'))) {
    const webEnv = readEnvFile('apps/web/.env.local')
    writeEnvFile('apps/web/.env.local', {
      ...webEnv,
      NEXT_PUBLIC_SERVER_AGENT_ASSET_ADDRESS: result.assetAddress,
    })
    console.log('Wrote NEXT_PUBLIC_SERVER_AGENT_ASSET_ADDRESS to apps/web/.env.local')
  }

  console.log('\nDone.')
}

main().catch((err) => {
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
