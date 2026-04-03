#!/usr/bin/env bun
/**
 * scripts/program-close-config.ts
 *
 * ⚠️  DEV/DEBUG ONLY — DO NOT RUN ON MAINNET
 *
 * Closes the KinkoConfig PDA using the close_config instruction.
 * Use this when you need to re-initialize config after a struct layout change.
 *
 * After running this, call: bun run program-init-config
 *
 * Usage: bun run program-close-config
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import * as anchor from '@coral-xyz/anchor'
import { Connection, PublicKey, Keypair } from '@solana/web3.js'

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
  const rpcUrl = serverEnv['SOLANA_RPC_URL'] ?? 'https://api.devnet.solana.com'
  const programId = new PublicKey(serverEnv['ANCHOR_PROGRAM_ID'] ?? 'HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt')
  const operatorKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(serverEnv['SERVER_AGENT_PRIVATE_KEY'] || '[]')))

  console.log('⚠️  DEV/DEBUG ONLY — closing KinkoConfig PDA')
  console.log('RPC      :', rpcUrl)
  console.log('Operator :', operatorKp.publicKey.toBase58())

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

  const existing = await connection.getAccountInfo(configPda)
  if (!existing) {
    console.log('\nConfig PDA not found — already closed or not initialized.')
    process.exit(0)
  }

  console.log('Config PDA:', configPda.toBase58(), `(${existing.data.length} bytes)`)

  const tx = await (program.methods as any)
    .closeConfig()
    .accounts({
      config: configPda,
      authority: operatorKp.publicKey,
    })
    .signers([operatorKp])
    .rpc()

  console.log('\n✅ KinkoConfig PDA closed')
  console.log('   Tx:', tx)
  console.log('\nNext: bun run program-init-config')
}

main().catch((err) => {
  console.error('Error:', err?.message ?? String(err))
  if (err?.logs?.length) {
    for (const l of err.logs) console.error(' ', l)
  }
  process.exit(1)
})
