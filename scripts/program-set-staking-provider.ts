#!/usr/bin/env bun
/**
 * scripts/program-set-staking-provider.ts
 *
 * Switch the active staking provider in KinkoConfig PDA.
 * Operator must sign — only the authority who called initialize_config can change this.
 *
 * Usage:
 *   bun run program-set-staking-provider simulated   # YIELD_RATE_BPS formula
 *   bun run program-set-staking-provider marinade    # Real Marinade CPI
 *   bun run program-set-staking-provider status      # Read current provider
 *
 * IMPORTANT: Switching to Marinade requires all existing user treasuries to
 * use deposit_marinade going forward. Existing simulated deposits do NOT
 * automatically get staked — users need to close and re-deposit.
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import * as anchor from '@coral-xyz/anchor'
import { Connection, PublicKey, Keypair } from '@solana/web3.js'

const ROOT = resolve(import.meta.dirname, '..')

const PROVIDER_MAP: Record<string, number> = {
  simulated: 0,
  marinade: 1,
}
const PROVIDER_NAMES: Record<number, string> = {
  0: 'Simulated',
  1: 'Marinade',
}

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
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: bun run program-set-staking-provider <simulated|marinade|status>')
    process.exit(1)
  }

  const serverEnv = readEnvFile('apps/server/.env')
  const rpcUrl = serverEnv['SOLANA_RPC_URL'] ?? 'https://api.devnet.solana.com'
  const programId = new PublicKey(serverEnv['ANCHOR_PROGRAM_ID'] ?? 'HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt')
  const operatorKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(serverEnv['SERVER_AGENT_PRIVATE_KEY'] || '[]')))

  const idl = await import('../contract/target/idl/kinko_treasury.json', { with: { type: 'json' } })
  const connection = new Connection(rpcUrl, 'confirmed')
  const wallet = new anchor.Wallet(operatorKp)
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  anchor.setProvider(provider)
  const program = new anchor.Program(idl.default as anchor.Idl, provider)

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('kinko_config')],
    programId
  )

  // Fetch current config
  const configAccount = await (program.account as any).kinkoConfig.fetch(configPda)
  const currentVariant = configAccount.stakingProvider
  const currentName = 'simulated' in currentVariant ? 'Simulated'
    : 'marinade' in currentVariant ? 'Marinade'
    : `Unknown(${JSON.stringify(currentVariant)})`

  console.log('Config PDA      :', configPda.toBase58())
  console.log('Authority       :', configAccount.authority.toBase58())
  console.log('Current provider:', currentName)

  if (arg === 'status') {
    console.log('\nAgent           :', configAccount.agent.toBase58())
    process.exit(0)
  }

  const providerNum = PROVIDER_MAP[arg]
  if (providerNum === undefined) {
    console.error(`Unknown provider "${arg}". Use: simulated, marinade, status`)
    process.exit(1)
  }

  const targetName = PROVIDER_NAMES[providerNum]
  if (currentName === targetName) {
    console.log(`\n⚠️  Already set to ${targetName} — nothing to do.`)
    process.exit(0)
  }

  if (providerNum === PROVIDER_MAP.marinade) {
    console.log('\n⚠️  Switching to Marinade:')
    console.log('   - Future deposits will use deposit_marinade instruction')
    console.log('   - Existing simulated treasuries need to re-deposit to accrue real yield')
    console.log('   - Frontend deposit flow must pass Marinade accounts')
  }

  console.log(`\nSwitching to ${targetName}...`)

  const tx = await (program.methods as any)
    .setStakingProvider(providerNum)
    .accounts({
      config: configPda,
      authority: operatorKp.publicKey,
    })
    .signers([operatorKp])
    .rpc()

  console.log(`\n✅ Staking provider set to ${targetName}`)
  console.log('   Tx:', tx)
}

main().catch((err) => {
  console.error('Error:', err?.message ?? String(err))
  if (err?.logs?.length) {
    for (const l of err.logs) console.error(' ', l)
  }
  process.exit(1)
})
