#!/usr/bin/env bun
/**
 * scripts/set-treasury-agent.ts
 *
 * Calls set_agent on the user's treasury PDA to register the server agent pubkey.
 * Must be signed by the treasury owner (the user wallet).
 *
 * Usage: bun run scripts/set-treasury-agent.ts
 * The script reads SERVER_AGENT_PRIVATE_KEY from apps/server/.env — the agent keypair
 * IS the owner wallet in this test setup (same keypair used to fund and deposit).
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import * as anchor from '@coral-xyz/anchor'
import { Connection, PublicKey, Keypair } from '@solana/web3.js'

const ROOT = resolve(import.meta.dirname, '../..')

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
  const agentKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(serverEnv['SERVER_AGENT_PRIVATE_KEY'])))

  console.log('RPC         :', rpcUrl)
  console.log('Program     :', programId.toBase58())
  console.log('Owner/Signer:', agentKp.publicKey.toBase58())
  console.log('Agent to set:', agentKp.publicKey.toBase58())

  const idl = await import('../target/idl/kinko_treasury.json', { with: { type: 'json' } })
  const connection = new Connection(rpcUrl, 'confirmed')
  const wallet = new anchor.Wallet(agentKp)
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  anchor.setProvider(provider)
  const program = new anchor.Program(idl.default as anchor.Idl, provider)

  const [treasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury'), agentKp.publicKey.toBuffer()],
    programId
  )

  console.log('Treasury PDA:', treasuryPda.toBase58())

  const tx = await (program.methods as any)
    .setAgent(agentKp.publicKey)
    .accounts({
      treasury: treasuryPda,
      owner: agentKp.publicKey,
    })
    .signers([agentKp])
    .rpc()

  console.log('\nDone! tx:', tx)
  console.log('Treasury agent is now set to:', agentKp.publicKey.toBase58())
}

main().catch((err) => {
  console.error('Error:', err?.message ?? String(err))
  if (err?.logs?.length) {
    for (const l of err.logs) console.error(' ', l)
  }
  process.exit(1)
})
