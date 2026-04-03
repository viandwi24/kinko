import { Hono } from 'hono'
import { Connection, PublicKey } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import { config } from '../config.js'
import { getTreasuryInfo } from '../services/treasury.js'

import idl from '../../../../contract/target/idl/kinko_treasury.json' with { type: 'json' }

export const configRoute = new Hono()

function getConfigPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('kinko_config')],
    programId
  )
  return pda
}

async function fetchStakingProvider(): Promise<'simulated' | 'marinade'> {
  try {
    const connection = new Connection(config.rpcUrl, 'confirmed')
    const wallet = new anchor.Wallet(config.agentKeypair)
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })
    anchor.setProvider(provider)
    const program = new anchor.Program(idl as anchor.Idl, provider)
    const programId = new PublicKey(config.programId)
    const configPda = getConfigPda(programId)
    const configAccount = await (program.account as any).kinkoConfig.fetch(configPda)
    const variant = configAccount.stakingProvider
    return 'marinade' in variant ? 'marinade' : 'simulated'
  } catch {
    return 'simulated'
  }
}

configRoute.get('/', async (c) => {
  const stakingProvider = await fetchStakingProvider()
  return c.json({
    programId: config.programId,
    rpcUrl: config.publicRpcUrl,
    agentAssetAddress: config.agentAssetAddress,
    agentKeypairPubkey: config.agentKeypair.publicKey.toBase58(),
    stakingProvider,
  })
})

/**
 * GET /api/config/admin/stats
 * Scan all UserTreasury PDAs and return aggregate stats.
 * Uses getProgramAccounts filtered by discriminator.
 */
configRoute.get('/admin/stats', async (c) => {
  try {
    const connection = new Connection(config.rpcUrl, 'confirmed')
    const wallet = new anchor.Wallet(config.agentKeypair)
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })
    anchor.setProvider(provider)
    const program = new anchor.Program(idl as anchor.Idl, provider)

    const accounts = await (program.account as any).userTreasury.all()

    let totalPrincipalLamports = 0n
    let totalYieldSpentLamports = 0n
    let totalAccounts = 0
    let pausedAccounts = 0

    for (const { account } of accounts) {
      totalAccounts++
      totalPrincipalLamports += BigInt(account.principalLamports?.toString() ?? '0')
      totalYieldSpentLamports += BigInt(account.totalYieldSpent?.toString() ?? '0')
      if (account.isPaused) pausedAccounts++
    }

    const LAMPORTS_PER_SOL = 1_000_000_000n
    return c.json({
      totalAccounts,
      pausedAccounts,
      totalPrincipalSol: Number(totalPrincipalLamports) / Number(LAMPORTS_PER_SOL),
      totalYieldSpentSol: Number(totalYieldSpentLamports) / Number(LAMPORTS_PER_SOL),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg }, 500)
  }
})
