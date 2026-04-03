#!/usr/bin/env bun
/**
 * scripts/init-config.ts
 *
 * Initializes the global KinkoConfig PDA on-chain (called ONCE after deploy).
 * Sets the agent pubkey — the only wallet allowed to call deduct_yield.
 *
 * Usage: bun run init-config
 *
 * Reads SERVER_AGENT_PRIVATE_KEY from apps/server/.env.
 * The agent pubkey is derived from the same keypair (server signs deduct_yield).
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
  const programId = new PublicKey(serverEnv['ANCHOR_PROGRAM_ID'] ?? 'aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL')
  const operatorKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(serverEnv['SERVER_AGENT_PRIVATE_KEY'] || '[]')))
  const agentPubkey = operatorKp.publicKey // same keypair = operator is the agent

  console.log('RPC         :', rpcUrl)
  console.log('Program     :', programId.toBase58())
  console.log('Operator    :', operatorKp.publicKey.toBase58())
  console.log('Agent pubkey:', agentPubkey.toBase58())

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
  console.log('Config PDA  :', configPda.toBase58())

  // Check if already initialized
  const existing = await connection.getAccountInfo(configPda)
  if (existing) {
    console.log('\n⚠️  Config PDA already initialized — nothing to do.')
    console.log('   If you need to change the agent, redeploy the contract.')
    process.exit(0)
  }

  const tx = await (program.methods as any)
    .initializeConfig(agentPubkey)
    .accounts({
      config: configPda,
      authority: operatorKp.publicKey,
    })
    .signers([operatorKp])
    .rpc()

  console.log('\n✅ KinkoConfig initialized!')
  console.log('   Config PDA :', configPda.toBase58())
  console.log('   Agent      :', agentPubkey.toBase58())
  console.log('   Tx         :', tx)
  console.log('\nAll user treasuries will now accept deduct_yield from this agent.')
}

main().catch((err) => {
  console.error('Error:', err?.message ?? String(err))
  if (err?.logs?.length) {
    for (const l of err.logs) console.error(' ', l)
  }
  process.exit(1)
})
