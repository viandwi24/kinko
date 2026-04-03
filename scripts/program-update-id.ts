#!/usr/bin/env bun
/**
 * scripts/program-update-id.ts
 *
 * After `anchor deploy` generates a new program keypair, run this to propagate
 * the new program ID everywhere it's hardcoded.
 *
 * Updates:
 *   - contract/programs/kinko-treasury/src/lib.rs  (declare_id!)
 *   - contract/Anchor.toml                          ([programs.localnet] + [programs.devnet])
 *   - apps/server/.env                              (ANCHOR_PROGRAM_ID)
 *   - apps/server/.env.example                      (ANCHOR_PROGRAM_ID)
 *   - apps/server/src/config.ts                     (fallback string)
 *   - apps/web/components/app/treasury-panel.tsx    (PROGRAM_ID constant)
 *   - scripts/*.ts                                  (hardcoded fallback strings)
 *
 * Usage:
 *   bun run program-update-id                 # reads from contract/target/deploy keypair
 *   bun run program-update-id <NEW_PUBKEY>    # explicit pubkey
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { Keypair } from '@solana/web3.js'

const ROOT = resolve(import.meta.dirname, '..')

// ── Derive new program ID ──────────────────────────────────────────────────────

let newId: string

const arg = process.argv[2]
if (arg && arg.length > 30) {
  newId = arg
  console.log('Using provided pubkey:', newId)
} else {
  const keypairPath = resolve(ROOT, 'contract/target/deploy/kinko_treasury-keypair.json')
  if (!existsSync(keypairPath)) {
    console.error('❌ Keypair not found at', keypairPath)
    console.error('   Run `anchor build` first, or pass the pubkey as an argument.')
    process.exit(1)
  }
  const bytes = JSON.parse(readFileSync(keypairPath, 'utf-8'))
  const kp = Keypair.fromSecretKey(Uint8Array.from(bytes))
  newId = kp.publicKey.toBase58()
  console.log('Derived from keypair:', keypairPath)
  console.log('New program ID:', newId)
}

// ── Current ID (read from lib.rs) ─────────────────────────────────────────────

const libRsPath = resolve(ROOT, 'contract/programs/kinko-treasury/src/lib.rs')
const libRsContent = readFileSync(libRsPath, 'utf-8')
const match = libRsContent.match(/declare_id!\("([^"]+)"\)/)
if (!match) {
  console.error('❌ Could not find declare_id! in lib.rs')
  process.exit(1)
}
const oldId = match[1]

if (oldId === newId) {
  console.log('\n✅ Program ID is already up to date:', newId)
  process.exit(0)
}

console.log('\nOld ID:', oldId)
console.log('New ID:', newId)
console.log()

// ── Patch helpers ─────────────────────────────────────────────────────────────

let patchCount = 0

function patchFile(relPath: string, transform: (content: string) => string) {
  const absPath = resolve(ROOT, relPath)
  if (!existsSync(absPath)) {
    console.log(`  skip (not found): ${relPath}`)
    return
  }
  const before = readFileSync(absPath, 'utf-8')
  const after = transform(before)
  if (before === after) {
    console.log(`  unchanged: ${relPath}`)
    return
  }
  writeFileSync(absPath, after, 'utf-8')
  console.log(`  ✔ updated: ${relPath}`)
  patchCount++
}

function replaceAll(content: string, from: string, to: string): string {
  return content.split(from).join(to)
}

// ── Patch each file ───────────────────────────────────────────────────────────

// 1. lib.rs — declare_id!
patchFile('contract/programs/kinko-treasury/src/lib.rs', c =>
  c.replace(/declare_id!\("[^"]+"\)/, `declare_id!("${newId}")`),
)

// 2. Anchor.toml — [programs.localnet] + [programs.devnet]
patchFile('contract/Anchor.toml', c => replaceAll(c, oldId, newId))

// 3. apps/server/.env — ANCHOR_PROGRAM_ID line
patchFile('apps/server/.env', c =>
  c.replace(/^(ANCHOR_PROGRAM_ID\s*=\s*).*$/m, `$1${newId}`),
)

// 4. apps/server/.env.example — ANCHOR_PROGRAM_ID line
patchFile('apps/server/.env.example', c =>
  c.replace(/^(ANCHOR_PROGRAM_ID\s*=\s*).*$/m, `$1${newId}`),
)

// 5. apps/server/src/config.ts — any fallback string
patchFile('apps/server/src/config.ts', c => replaceAll(c, oldId, newId))

// 6. treasury-panel.tsx — PROGRAM_ID constant
patchFile('apps/web/components/app/treasury-panel.tsx', c => replaceAll(c, oldId, newId))

// 7. All scripts — hardcoded fallback strings
const scriptFiles = [
  'scripts/program-init-config.ts',
  'scripts/program-set-staking-provider.ts',
  'scripts/program-close-config.ts',
  'scripts/program-migrate-account.ts',
  'scripts/program-sim-yield.ts',
  'contract/scripts/set-treasury-agent.ts',
]
for (const f of scriptFiles) {
  patchFile(f, c => replaceAll(c, oldId, newId))
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log()
if (patchCount > 0) {
  console.log(`✅ Updated ${patchCount} file(s). Program ID is now: ${newId}`)
  console.log()
  console.log('Next steps:')
  console.log('  1. anchor build  (to rebuild with new declare_id)')
  console.log('  2. anchor deploy --provider.cluster devnet')
  console.log('  3. bun run program-init-config')
} else {
  console.log('Nothing changed.')
}
