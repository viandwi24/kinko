/**
 * treasury.ts — reads and deducts yield from the user's Anchor Treasury PDA
 *
 * The agent keypair must match the `agent` field registered on each UserTreasury.
 * The yield calculation mirrors the Rust impl in user_treasury.rs.
 */

import * as anchor from '@coral-xyz/anchor'
import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { config } from '../config.js'

import idl from '../../../../contract/target/idl/kinko_treasury.json' with { type: 'json' }

const YIELD_RATE_BPS = 800n
const BPS_DENOMINATOR = 10_000n
const SECONDS_PER_YEAR = BigInt(365 * 24 * 60 * 60)
const LAMPORTS_PER_SOL = 1_000_000_000n

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTreasuryPda(owner: PublicKey, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury'), owner.toBuffer()],
    programId
  )
  return pda
}

function getConfigPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('kinko_config')],
    programId
  )
  return pda
}

function computeAvailableYield(
  principalLamports: bigint,
  depositTimestamp: bigint,
  totalYieldSpent: bigint,
  nowSeconds: bigint
): bigint {
  const elapsed = nowSeconds > depositTimestamp ? nowSeconds - depositTimestamp : 0n
  const accrued =
    (principalLamports * YIELD_RATE_BPS * elapsed) / BPS_DENOMINATOR / SECONDS_PER_YEAR
  const available = accrued > totalYieldSpent ? accrued - totalYieldSpent : 0n
  return available
}

// ─── Service ──────────────────────────────────────────────────────────────────

function buildProgram(agentKeypair: Keypair) {
  const connection = new Connection(config.rpcUrl, 'confirmed')
  const wallet = new anchor.Wallet(agentKeypair)
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  })
  anchor.setProvider(provider)

  return new anchor.Program(idl as anchor.Idl, provider)
}

export type TreasuryInfo = {
  principalSol: number
  availableYieldSol: number
  totalYieldSpentSol: number
}

export async function getTreasuryInfo(userWallet: string): Promise<TreasuryInfo | null> {
  const agentKeypair = config.agentKeypair
  const program = buildProgram(agentKeypair)
  const programId = new PublicKey(config.programId)
  const ownerPubkey = new PublicKey(userWallet)
  const treasuryPda = getTreasuryPda(ownerPubkey, programId)

  try {
    const account = await (program.account as any).userTreasury.fetch(treasuryPda)
    const nowSeconds = BigInt(Math.floor(Date.now() / 1000))
    const principal = BigInt(account.principalLamports.toString())
    const depositTs = BigInt(account.depositTimestamp.toString())
    const yieldSpent = BigInt(account.totalYieldSpent.toString())

    const available = computeAvailableYield(principal, depositTs, yieldSpent, nowSeconds)

    return {
      principalSol: Number(principal) / Number(LAMPORTS_PER_SOL),
      availableYieldSol: Number(available) / Number(LAMPORTS_PER_SOL),
      totalYieldSpentSol: Number(yieldSpent) / Number(LAMPORTS_PER_SOL),
    }
  } catch {
    return null
  }
}

export type DeductResult = {
  txHash: string
  yieldSpentLamports: bigint
  remainingYieldLamports: bigint
}

export async function checkAndDeductYield(
  userWallet: string,
  amountLamports: bigint
): Promise<DeductResult> {
  const agentKeypair = config.agentKeypair
  const program = buildProgram(agentKeypair)
  const programId = new PublicKey(config.programId)
  const ownerPubkey = new PublicKey(userWallet)
  const treasuryPda = getTreasuryPda(ownerPubkey, programId)

  // Fetch and verify yield is sufficient
  const account = await (program.account as any).userTreasury.fetch(treasuryPda)
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000))
  const principal = BigInt(account.principalLamports.toString())
  const depositTs = BigInt(account.depositTimestamp.toString())
  const yieldSpent = BigInt(account.totalYieldSpent.toString())
  const available = computeAvailableYield(principal, depositTs, yieldSpent, nowSeconds)

  if (available < amountLamports) {
    throw new Error(
      `InsufficientYield: available ${available} lamports, needed ${amountLamports}`
    )
  }

  const configPda = getConfigPda(programId)

  // Call deduct_yield — agent signs, yield goes to agent's own wallet (recipient = agent)
  const txHash = await (program.methods as any)
    .deductYield(new anchor.BN(amountLamports.toString()))
    .accounts({
      treasury: treasuryPda,
      config: configPda,
      agent: agentKeypair.publicKey,
      recipient: agentKeypair.publicKey,
    })
    .signers([agentKeypair])
    .rpc()

  const remaining = available - amountLamports

  return {
    txHash,
    yieldSpentLamports: amountLamports,
    remainingYieldLamports: remaining,
  }
}
