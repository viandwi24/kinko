#!/usr/bin/env bun
/**
 * scripts/update-agent-name.ts
 *
 * Updates the name (and optionally URI) of an already-registered Kinko Agent Core Asset.
 * Reads SERVER_AGENT_NAME, SERVER_AGENT_ASSET_ADDRESS, SERVER_AGENT_PRIVATE_KEY from apps/server/.env.
 *
 * Usage: bun run scripts/update-agent-name.ts
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { publicKey } from '@metaplex-foundation/umi'
import { updateV1 } from '@metaplex-foundation/mpl-core'
import { createKinkoUmi } from '../packages/solana/src/umi.ts'

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

async function main() {
  const serverEnv = readEnvFile('apps/server/.env')

  const assetAddress = serverEnv['SERVER_AGENT_ASSET_ADDRESS']
  if (!assetAddress) {
    console.error('Error: SERVER_AGENT_ASSET_ADDRESS not set in apps/server/.env')
    console.error('Run: bun run scripts/register-agent.ts first')
    process.exit(1)
  }

  const newName = serverEnv['SERVER_AGENT_NAME'] ?? 'Kinko'
  const newUri  = `${serverEnv['SERVER_URL'] ?? 'http://localhost:3001'}/.well-known/metadata.json`

  process.env['OPERATOR_PRIVATE_KEY'] = serverEnv['SERVER_AGENT_PRIVATE_KEY']
  process.env['SOLANA_RPC_URL']       = serverEnv['SOLANA_RPC_URL']

  const umi = createKinkoUmi()

  console.log('Asset   :', assetAddress)
  console.log('New name:', newName)
  console.log('New URI :', newUri)
  console.log('')

  await updateV1(umi, {
    asset: publicKey(assetAddress),
    newName,
    newUri,
  }).sendAndConfirm(umi)

  console.log('Done — asset name and URI updated.')
}

main().catch((err) => {
  console.error('Error:', err?.message ?? String(err))
  if (err?.logs?.length) {
    console.error('\nTransaction logs:')
    for (const line of err.logs) console.error(' ', line)
  }
  process.exit(1)
})
