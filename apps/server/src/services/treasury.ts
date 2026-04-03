/**
 * treasury.ts — reads and deducts yield from the user's Anchor Treasury PDA.
 *
 * Supports two staking providers (read from KinkoConfig PDA):
 *  - Simulated (0): yield via YIELD_RATE_BPS formula
 *  - Marinade  (1): yield from mSOL/SOL exchange rate appreciation
 */

import * as anchor from '@coral-xyz/anchor'
import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { config } from '../config.js'

import idl from '../../../../contract/target/idl/kinko_treasury.json' with { type: 'json' }

// ─── Staking provider constants ────────────────────────────────────────────────

const STAKING_PROVIDER_SIMULATED = 0
const STAKING_PROVIDER_MARINADE  = 1

// Marinade Finance — devnet addresses (from docs.marinade.finance/developers/contract-addresses)
const MARINADE_PROGRAM_ID    = new PublicKey('MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD')
const MSOL_MINT              = new PublicKey('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So')
const MARINADE_STATE_ADDRESS = new PublicKey('8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC')
const LIQ_POOL_SOL_LEG_PDA  = new PublicKey('UefNb6z6yvArqe4cJHTXCqStRsKmWhGxnZzuHbikP5Q')
const LIQ_POOL_MSOL_LEG     = new PublicKey('7GgPYjS5Dza89wV6FpZ23kUJRG5vbQ1GM25ezspYFSoE')
const RESERVE_PDA            = new PublicKey('Du3Ysj1wKbxPKkuPPnvzQLQh8oMSVifs3jGZjJWXFmHN')
const TREASURY_MSOL_ACCOUNT  = new PublicKey('8ZUcztoAEhpAeC2ixWewJKQJsSUGYSGPVAjkhDJYf5Gd')
const MSOL_MINT_AUTHORITY    = new PublicKey('3JLPCS1qM2zRw3Dp6V4hZnYHd4toMNPkNesXdX9tg6KM')

// ─── Simulated yield constants ─────────────────────────────────────────────────

const YIELD_RATE_BPS     = 800n
const BPS_DENOMINATOR    = 10_000n
const SECONDS_PER_YEAR   = BigInt(365 * 24 * 60 * 60)
const LAMPORTS_PER_SOL   = 1_000_000_000n

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function computeAvailableYieldSimulated(
  principalLamports: bigint,
  depositTimestamp: bigint,
  totalYieldSpent: bigint,
  nowSeconds: bigint
): bigint {
  const elapsed = nowSeconds > depositTimestamp ? nowSeconds - depositTimestamp : 0n
  const accrued =
    (principalLamports * YIELD_RATE_BPS * elapsed) / BPS_DENOMINATOR / SECONDS_PER_YEAR
  return accrued > totalYieldSpent ? accrued - totalYieldSpent : 0n
}

function computeAvailableYieldMarinade(
  principalLamports: bigint,
  msolValueLamports: bigint,
  totalYieldSpent: bigint
): bigint {
  const gross = msolValueLamports > principalLamports
    ? msolValueLamports - principalLamports
    : 0n
  return gross > totalYieldSpent ? gross - totalYieldSpent : 0n
}

/**
 * Parse mSOL/SOL exchange rate from Marinade state account.
 * Returns [numerator, denominator] where 1 mSOL = num/den lamports.
 *
 * Marinade devnet state layout (verified by scanning for ratio ≈ 1.0):
 * offset 344: msol_price_numerator (u64 LE)
 * offset 352: msol_price_denominator (u64 LE)
 * NOTE: devnet offset differs from mainnet (392/400). Verified empirically.
 */
function parseMsolPrice(data: Buffer): [bigint, bigint] {
  if (data.length < 360) {
    throw new Error('Marinade state account too small')
  }
  const num = data.readBigUInt64LE(344)
  const den = data.readBigUInt64LE(352)
  if (den === 0n) throw new Error('Marinade msol price denominator is zero')
  return [num, den]
}

/**
 * Fetch current mSOL/SOL exchange rate from Marinade state.
 * Returns (msolPriceNum, msolPriceDen) — 1 mSOL = num/den lamports.
 */
async function fetchMsolPrice(connection: Connection): Promise<[bigint, bigint]> {
  const info = await connection.getAccountInfo(MARINADE_STATE_ADDRESS)
  if (!info) throw new Error('Marinade state account not found')
  return parseMsolPrice(Buffer.from(info.data))
}

/**
 * Get treasury's mSOL ATA address (the ATA owned by the treasury PDA for mSOL).
 */
function getMsolAta(treasuryPda: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [
      treasuryPda.toBuffer(),
      new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBuffer(),
      MSOL_MINT.toBuffer(),
    ],
    new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
  )
  return ata
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
  stakingProvider: 'simulated' | 'marinade'
  // V3 spending controls (null if treasury is on older layout)
  maxPerRequestSol: number | null
  dailyLimitSol: number | null
  daySpentSol: number | null
  isPaused: boolean | null
}

export async function getTreasuryInfo(userWallet: string): Promise<TreasuryInfo | null> {
  const agentKeypair = config.agentKeypair
  const program = buildProgram(agentKeypair)
  const provider = program.provider as anchor.AnchorProvider
  const connection = provider.connection
  const programId = new PublicKey(config.programId)
  const ownerPubkey = new PublicKey(userWallet)
  const treasuryPda = getTreasuryPda(ownerPubkey, programId)
  const configPda = getConfigPda(programId)

  try {
    const [account, configAccount] = await Promise.all([
      (program.account as any).userTreasury.fetch(treasuryPda),
      (program.account as any).kinkoConfig.fetch(configPda),
    ])

    const principal = BigInt(account.principalLamports.toString())
    const depositTs = BigInt(account.depositTimestamp.toString())
    const yieldSpent = BigInt(account.totalYieldSpent.toString())
    const msolAmount = BigInt(account.msolAmount.toString())
    const nowSeconds = BigInt(Math.floor(Date.now() / 1000))

    // V3 fields (may be undefined for older layout accounts)
    const maxPerReqLamports = account.maxPerRequestLamports != null
      ? BigInt(account.maxPerRequestLamports.toString()) : null
    const dailyLimitLamports = account.dailyLimitLamports != null
      ? BigInt(account.dailyLimitLamports.toString()) : null
    const daySpentLamports = account.daySpentLamports != null
      ? BigInt(account.daySpentLamports.toString()) : null
    const isPaused: boolean | null = account.isPaused ?? null

    const providerVariant = configAccount.stakingProvider
    const isSimulated = 'simulated' in providerVariant || providerVariant === STAKING_PROVIDER_SIMULATED

    let available: bigint
    let stakingProvider: 'simulated' | 'marinade'

    if (isSimulated) {
      available = computeAvailableYieldSimulated(principal, depositTs, yieldSpent, nowSeconds)
      stakingProvider = 'simulated'
    } else {
      // Marinade: compute yield from mSOL exchange rate
      const [priceNum, priceDen] = await fetchMsolPrice(connection)
      const msolValueLamports = (msolAmount * priceNum) / priceDen
      available = computeAvailableYieldMarinade(principal, msolValueLamports, yieldSpent)
      stakingProvider = 'marinade'
    }

    return {
      principalSol: Number(principal) / Number(LAMPORTS_PER_SOL),
      availableYieldSol: Number(available) / Number(LAMPORTS_PER_SOL),
      totalYieldSpentSol: Number(yieldSpent) / Number(LAMPORTS_PER_SOL),
      stakingProvider,
      maxPerRequestSol: maxPerReqLamports != null ? Number(maxPerReqLamports) / Number(LAMPORTS_PER_SOL) : null,
      dailyLimitSol: dailyLimitLamports != null ? Number(dailyLimitLamports) / Number(LAMPORTS_PER_SOL) : null,
      daySpentSol: daySpentLamports != null ? Number(daySpentLamports) / Number(LAMPORTS_PER_SOL) : null,
      isPaused: isPaused,
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
  const provider = program.provider as anchor.AnchorProvider
  const connection = provider.connection
  const programId = new PublicKey(config.programId)
  const ownerPubkey = new PublicKey(userWallet)
  const treasuryPda = getTreasuryPda(ownerPubkey, programId)
  const configPda = getConfigPda(programId)

  const [account, configAccount] = await Promise.all([
    (program.account as any).userTreasury.fetch(treasuryPda),
    (program.account as any).kinkoConfig.fetch(configPda),
  ])

  const principal = BigInt(account.principalLamports.toString())
  const depositTs = BigInt(account.depositTimestamp.toString())
  const yieldSpent = BigInt(account.totalYieldSpent.toString())
  const msolAmount = BigInt(account.msolAmount.toString())
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000))

  const providerVariant = configAccount.stakingProvider
  const isSimulated = 'simulated' in providerVariant || providerVariant === STAKING_PROVIDER_SIMULATED

  let available: bigint
  let txHash: string

  if (isSimulated) {
    available = computeAvailableYieldSimulated(principal, depositTs, yieldSpent, nowSeconds)

    if (available < amountLamports) {
      throw new Error(`InsufficientYield: available ${available} lamports, needed ${amountLamports}`)
    }

    txHash = await (program.methods as any)
      .deductYield(new anchor.BN(amountLamports.toString()))
      .accounts({
        treasury: treasuryPda,
        config: configPda,
        agent: agentKeypair.publicKey,
        recipient: agentKeypair.publicKey,
      })
      .signers([agentKeypair])
      .rpc()

  } else {
    // Marinade: check yield from mSOL exchange rate
    const [priceNum, priceDen] = await fetchMsolPrice(connection)
    const msolValueLamports = (msolAmount * priceNum) / priceDen
    available = computeAvailableYieldMarinade(principal, msolValueLamports, yieldSpent)

    if (available < amountLamports) {
      throw new Error(`InsufficientYield: available ${available} lamports, needed ${amountLamports}`)
    }

    // Get treasury's mSOL ATA
    const treasuryMsolAccount = getMsolAta(treasuryPda)

    txHash = await (program.methods as any)
      .deductYieldMarinade(new anchor.BN(amountLamports.toString()))
      .accounts({
        treasury: treasuryPda,
        config: configPda,
        agent: agentKeypair.publicKey,
        recipient: agentKeypair.publicKey,
        msolMint: MSOL_MINT,
        treasuryMsolAccount,
        marinadeState: MARINADE_STATE_ADDRESS,
        liqPoolSolLegPda: LIQ_POOL_SOL_LEG_PDA,
        liqPoolMsolLeg: LIQ_POOL_MSOL_LEG,
        treasuryMsolLeg: TREASURY_MSOL_ACCOUNT,
        marinadeProgram: MARINADE_PROGRAM_ID,
      })
      .signers([agentKeypair])
      .rpc()
  }

  const remaining = available - amountLamports

  return {
    txHash,
    yieldSpentLamports: amountLamports,
    remainingYieldLamports: remaining,
  }
}

