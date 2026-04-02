#!/usr/bin/env bun
/**
 * scripts/register-prices-agent.ts
 *
 * Registers "Kinko Prices" as a separate MPL Core Asset on devnet.
 * Uses the same operator keypair as the main Kinko agent.
 * Writes KINKO_PRICES_ASSET_ADDRESS back to apps/server/.env.
 *
 * Usage: bun run register-prices-agent
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

  const serviceUrl = serverEnv['SERVER_URL'] ?? 'http://localhost:3001'

  // Set env vars before dynamic import — Bun evaluates at import time
  process.env['OPERATOR_PRIVATE_KEY'] = serverEnv['SERVER_AGENT_PRIVATE_KEY']
  process.env['SOLANA_RPC_URL']       = serverEnv['SOLANA_RPC_URL'] ?? 'https://api.devnet.solana.com'
  process.env['AGENT_NAME']           = 'Kinko Prices'
  // Prices agent has its own sub-path for all well-known endpoints
  process.env['AGENT_SERVICE_URL']    = `${serviceUrl}/agents/prices`

  console.log('RPC         :', process.env['SOLANA_RPC_URL'])
  console.log('Service URL :', process.env['AGENT_SERVICE_URL'])
  console.log('Agent name  :', process.env['AGENT_NAME'])
  console.log('')

  const { setupAgentCoreOnly } = await import('../packages/solana/src/scripts/setup-agent.ts')
  const result = await setupAgentCoreOnly()

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('Done — Kinko Prices Core Asset created:')
  console.log(`  KINKO_PRICES_ASSET_ADDRESS = ${result.assetAddress}`)
  console.log(`  ASSET_SIGNER_PDA           = ${result.assetSignerPda}`)
  console.log('═══════════════════════════════════════════════════════════\n')

  // Write KINKO_PRICES_ASSET_ADDRESS to apps/server/.env
  writeEnvFile('apps/server/.env', {
    ...serverEnv,
    KINKO_PRICES_ASSET_ADDRESS: result.assetAddress,
  })
  console.log('Wrote KINKO_PRICES_ASSET_ADDRESS to apps/server/.env')
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
