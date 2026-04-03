#!/usr/bin/env bun
/**
 * sim-yield.ts — Toggle simulated fast yield for testing
 *
 * Usage:
 *   bun run sim-yield on    → set YIELD_RATE_BPS to 1,000,000 (100x APY, ~1 req per minute)
 *   bun run sim-yield off   → restore YIELD_RATE_BPS to 800 (8% APY)
 *   bun run sim-yield status → show current value
 *
 * After toggling, rebuilds + redeploys contract to devnet automatically.
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

const ROOT = resolve(import.meta.dirname, '..')
const TREASURY_RS = resolve(ROOT, 'contract/programs/kinko-treasury/src/state/user_treasury.rs')

const PROD_BPS  = 800         // 8% APY
const SIM_BPS   = 3_153_600_000 // ~10,000x per second

function readFile() {
  return readFileSync(TREASURY_RS, 'utf-8')
}

function getCurrentBps(): number {
  const match = readFile().match(/pub const YIELD_RATE_BPS: u64 = (\d+);/)
  return match ? parseInt(match[1] || '0') : -1
}

function setBps(bps: number, label: string) {
  const content = readFile()
  const updated = content.replace(
    /pub const YIELD_RATE_BPS: u64 = \d+;/,
    `pub const YIELD_RATE_BPS: u64 = ${bps}; // ${label}`
  )
  writeFileSync(TREASURY_RS, updated, 'utf-8')
  console.log(`✓ YIELD_RATE_BPS set to ${bps} (${label})`)
}

function rebuild() {
  console.log('\nRebuilding contract...')
  execSync('anchor build', { cwd: resolve(ROOT, 'contract'), stdio: 'inherit' })
}

function redeploy() {
  console.log('\nRedeploying to devnet...')
  execSync(
    'anchor deploy --provider.cluster devnet --provider.wallet ../data/agent-keypair.json',
    { cwd: resolve(ROOT, 'contract'), stdio: 'inherit' }
  )
}

const mode = process.argv[2]
const current = getCurrentBps()

if (mode === 'status') {
  const isSim = current !== PROD_BPS
  console.log(`Current YIELD_RATE_BPS: ${current}`)
  console.log(`Mode: ${isSim ? '⚡ SIMULATION (fast yield)' : '✅ PRODUCTION (8% APY)'}`)
  process.exit(0)
}

if (mode === 'on') {
  if (current === SIM_BPS) {
    console.log('Already in simulation mode.')
    process.exit(0)
  }
  setBps(SIM_BPS, 'SIMULATION — 100% per second')
  rebuild()
  redeploy()
  console.log('\n⚡ Simulation mode ON — yield accrues very fast')
  console.log('   Run "bun run sim-yield off" to restore production APY\n')
} else if (mode === 'off') {
  if (current === PROD_BPS) {
    console.log('Already in production mode.')
    process.exit(0)
  }
  setBps(PROD_BPS, '8.00% APY')
  rebuild()
  redeploy()
  console.log('\n✅ Production mode restored — 8% APY\n')
} else {
  console.log('Usage: bun run sim-yield [on|off|status]')
  console.log('')
  console.log('  on      → fast yield for testing (rebuild + redeploy)')
  console.log('  off     → restore 8% APY (rebuild + redeploy)')
  console.log('  status  → show current mode (no rebuild)')
  process.exit(1)
}
