#!/usr/bin/env bun
/**
 * program-migrate-account.ts
 *
 * Migrates a stale treasury account (old layout with `agent` field) to the
 * new layout (without `agent` field).
 *
 * What it does:
 *   1. Detect old account (97 bytes) vs new (65 bytes)
 *   2. Call migrate_treasury — closes old account, returns all lamports to owner
 *   3. Call initialize — create new account with correct layout
 *   4. Call deposit — re-lock original principal
 *
 * Usage: bun run program-migrate-account
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'

const ROOT = resolve(import.meta.dirname, '..')

const DISC_INITIALIZE     = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237])
const DISC_DEPOSIT        = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182])

const OLD_ACCOUNT_SIZE = 8 + 32 + 32 + 8 + 8 + 8 + 1 // 97 — has agent field
const NEW_ACCOUNT_SIZE = 8 + 32 + 8 + 8 + 8 + 1       // 65 — no agent field

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

function encodeLamports(lamports: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(lamports)
  return buf
}

async function sendAndConfirm(connection: Connection, tx: Transaction, signers: Keypair[], label: string): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = signers[0].publicKey
  tx.sign(...signers)
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
  console.log(`  ✅ ${label} — tx: ${sig.slice(0, 20)}…`)
  return sig
}

async function main() {
  const serverEnv = readEnvFile('apps/server/.env')
  const rpcUrl = serverEnv['SOLANA_RPC_URL'] ?? 'https://api.devnet.solana.com'
  const programId = new PublicKey(serverEnv['ANCHOR_PROGRAM_ID'] ?? 'aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL')
  const ownerKp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(serverEnv['SERVER_AGENT_PRIVATE_KEY'])))
  const connection = new Connection(rpcUrl, 'confirmed')

  const [treasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury'), ownerKp.publicKey.toBuffer()],
    programId
  )

  console.log('RPC          :', rpcUrl)
  console.log('Program      :', programId.toBase58())
  console.log('Owner        :', ownerKp.publicKey.toBase58())
  console.log('Treasury PDA :', treasuryPda.toBase58())
  console.log()

  const accountInfo = await connection.getAccountInfo(treasuryPda)
  if (!accountInfo) {
    console.log('✅ No treasury account found — nothing to migrate.')
    process.exit(0)
  }

  const size = accountInfo.data.length
  console.log(`Account size : ${size} bytes`)

  if (size === NEW_ACCOUNT_SIZE) {
    console.log('✅ Account already on new layout — no migration needed.')
    process.exit(0)
  }

  if (size !== OLD_ACCOUNT_SIZE) {
    console.log(`⚠️  Unknown size ${size}. Expected ${OLD_ACCOUNT_SIZE} (old) or ${NEW_ACCOUNT_SIZE} (new).`)
    process.exit(1)
  }

  // Parse principal from old layout: offset 8+32+32 = 72
  const principalLamports = accountInfo.data.readBigUInt64LE(72)
  const principalSol = Number(principalLamports) / LAMPORTS_PER_SOL
  console.log(`Old layout detected — principal: ${principalSol} SOL`)
  console.log()

  // Get migrate_treasury discriminator from IDL
  const idl = await import('../contract/target/idl/kinko_treasury.json', { with: { type: 'json' } })
  const migrateIx = (idl.default as any).instructions.find((i: any) => i.name === 'migrate_treasury')
  const DISC_MIGRATE = Buffer.from(migrateIx.discriminator)

  // Step 1: migrate_treasury (close old account, return lamports to owner)
  console.log('Step 1: Migrating old account...')
  await sendAndConfirm(
    connection,
    new Transaction().add(new TransactionInstruction({
      programId,
      keys: [
        { pubkey: treasuryPda,            isSigner: false, isWritable: true },
        { pubkey: ownerKp.publicKey,       isSigner: true,  isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: DISC_MIGRATE,
    })),
    [ownerKp],
    'migrate_treasury'
  )

  // Small delay to ensure account is cleared on-chain
  await new Promise(r => setTimeout(r, 2000))

  // Step 2: initialize (new layout)
  console.log('\nStep 2: Initializing new treasury layout...')
  await sendAndConfirm(
    connection,
    new Transaction().add(new TransactionInstruction({
      programId,
      keys: [
        { pubkey: treasuryPda,            isSigner: false, isWritable: true },
        { pubkey: ownerKp.publicKey,       isSigner: true,  isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: DISC_INITIALIZE,
    })),
    [ownerKp],
    'initialize'
  )

  // Step 3: deposit original principal
  if (principalLamports > 0n) {
    console.log(`\nStep 3: Re-depositing ${principalSol} SOL...`)
    await sendAndConfirm(
      connection,
      new Transaction().add(new TransactionInstruction({
        programId,
        keys: [
          { pubkey: treasuryPda,            isSigner: false, isWritable: true },
          { pubkey: ownerKp.publicKey,       isSigner: true,  isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([DISC_DEPOSIT, encodeLamports(principalLamports)]),
      })),
      [ownerKp],
      'deposit'
    )
  }

  console.log('\n✅ Migration complete!')
  console.log(`   Treasury PDA : ${treasuryPda.toBase58()}`)
  console.log(`   Principal    : ${principalSol} SOL`)
  console.log('\nYou can now use the chat feature normally.')
}

main().catch((err) => {
  console.error('Error:', err?.message ?? String(err))
  if (err?.logs?.length) {
    for (const l of err.logs) console.error('  ', l)
  }
  process.exit(1)
})
