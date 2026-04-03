'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js'
import { toast } from 'sonner'
import { useTreasury } from '@/hooks/use-treasury'
import { useServerConfig } from '@/hooks/use-server-config'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Copy, ArrowDownToLine, AlertTriangleIcon, RefreshCwIcon, ExternalLink, Settings2, PauseCircle, PlayCircle } from 'lucide-react'

const PROGRAM_ID = new PublicKey('HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt')
const MARINADE_PROGRAM_ID = new PublicKey('MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD')
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

// Marinade devnet addresses — docs.marinade.finance/developers/contract-addresses
const MSOL_MINT             = new PublicKey('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So')
const MARINADE_STATE        = new PublicKey('8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC')
const LIQ_POOL_SOL_LEG_PDA = new PublicKey('UefNb6z6yvArqe4cJHTXCqStRsKmWhGxnZzuHbikP5Q')
const LIQ_POOL_MSOL_LEG    = new PublicKey('7GgPYjS5Dza89wV6FpZ23kUJRG5vbQ1GM25ezspYFSoE')
const RESERVE_PDA           = new PublicKey('Du3Ysj1wKbxPKkuPPnvzQLQh8oMSVifs3jGZjJWXFmHN')
const MSOL_MINT_AUTHORITY   = new PublicKey('3JLPCS1qM2zRw3Dp6V4hZnYHd4toMNPkNesXdX9tg6KM')

const DISC_INITIALIZE       = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237])
const DISC_DEPOSIT          = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182])
const DISC_DEPOSIT_MARINADE = Buffer.from([2, 215, 97, 108, 5, 73, 116, 204])
const DISC_MIGRATE          = Buffer.from([13, 5, 40, 102, 230, 124, 105, 118])
const DISC_MIGRATE_V2       = Buffer.from([245, 161, 182, 132, 205, 168, 126, 166])
const DISC_CLOSE_TREASURY      = Buffer.from([113, 239, 0, 73, 12, 113, 171, 43])
const DISC_WITHDRAW_MARINADE   = Buffer.from([141, 149, 162, 126, 110, 48, 117, 15])
const DISC_MIGRATE_V3          = Buffer.from([57, 197, 129, 68, 41, 166, 5, 236])
const DISC_SET_USER_SETTINGS   = Buffer.from([26, 175, 170, 93, 31, 136, 123, 56])
const DISC_SET_PAUSED          = Buffer.from([91, 60, 125, 192, 176, 225, 166, 218])

const V0_ACCOUNT_SIZE = 97  // disc(8)+owner(32)+agent(32)+principal(8)+ts(8)+spent(8)+bump(1)
const V1_ACCOUNT_SIZE = 65  // disc(8)+owner(32)+principal(8)+ts(8)+spent(8)+bump(1)
const V2_ACCOUNT_SIZE = 73  // disc(8)+owner(32)+principal(8)+ts(8)+spent(8)+msol(8)+bump(1)
const V3_ACCOUNT_SIZE = 106 // +max_per_req(8)+daily_limit(8)+day_spent(8)+day_start(8)+is_paused(1)

function getTreasuryPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('treasury'), owner.toBuffer()],
    PROGRAM_ID,
  )
}

function getConfigPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('kinko_config')],
    PROGRAM_ID,
  )
  return pda
}

function getMsolAta(authority: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [
      authority.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      MSOL_MINT.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )
  return ata
}

function encodeLamports(lamports: bigint): Uint8Array {
  const buf = new ArrayBuffer(8)
  new DataView(buf).setBigUint64(0, lamports, true)
  return new Uint8Array(buf)
}

// liq_pool_msol_leg_authority — seeds: [MARINADE_STATE, b"liq_st_sol_authority"], program = Marinade
const [LIQ_POOL_MSOL_LEG_AUTHORITY] = PublicKey.findProgramAddressSync(
  [MARINADE_STATE.toBuffer(), Buffer.from('liq_st_sol_authority')],
  MARINADE_PROGRAM_ID,
)

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-foreground">{value}</span>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

export function TreasuryPanel() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { treasury, isLoading, refetch } = useTreasury()
  const { serverConfig } = useServerConfig()

  const [solAmount, setSolAmount] = useState('0.1')
  const [depositing, setDepositing] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [closing, setClosing] = useState(false)
  const [needsMigration, setNeedsMigration] = useState<'v0' | 'v1' | 'v2' | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsMaxPerReq, setSettingsMaxPerReq] = useState('')
  const [settingsDailyLimit, setSettingsDailyLimit] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [togglingPause, setTogglingPause] = useState(false)
  const [oldPrincipalSol, setOldPrincipalSol] = useState(0)
  const [detectionTick, setDetectionTick] = useState(0)

  const stakingProvider = serverConfig?.stakingProvider ?? treasury?.stakingProvider ?? 'simulated'
  const isMarinade = stakingProvider === 'marinade'

  // Detect old layout accounts — re-runs on detectionTick to catch post-migration state
  useEffect(() => {
    if (!publicKey) { setNeedsMigration(null); return }
    const [pda] = getTreasuryPDA(publicKey)
    connection.getAccountInfo(pda).then((info) => {
      if (!info) { setNeedsMigration(null); return }
      if (info.data.length === V0_ACCOUNT_SIZE) {
        const principal = (info.data as Buffer).readBigUInt64LE(72) // old offset: 8+32+32
        setOldPrincipalSol(Number(principal) / 1e9)
        setNeedsMigration('v0')
      } else if (info.data.length === V1_ACCOUNT_SIZE) {
        const principal = (info.data as Buffer).readBigUInt64LE(40) // offset: 8+32
        setOldPrincipalSol(Number(principal) / 1e9)
        setNeedsMigration('v1')
      } else if (info.data.length === V2_ACCOUNT_SIZE) {
        setNeedsMigration('v2')
      } else {
        setNeedsMigration(null)
      }
    }).catch(() => setNeedsMigration(null))
  }, [publicKey, connection, detectionTick])

  async function handleMigrate() {
    if (!publicKey) return
    setMigrating(true)
    try {
      const [treasuryPDA] = getTreasuryPDA(publicKey)
      const info = await connection.getAccountInfo(treasuryPDA)
      if (!info) { toast.error('No treasury account found'); return }

      if (info.data.length === V0_ACCOUNT_SIZE) {
        // V0 → close + reinitialize + re-deposit (two transactions)
        const principalLamports = (info.data as Buffer).readBigUInt64LE(72)

        const migrateTx = new Transaction().add(new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: treasuryPDA,            isSigner: false, isWritable: true },
            { pubkey: publicKey,               isSigner: true,  isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: DISC_MIGRATE,
        }))
        const sig1 = await sendTransaction(migrateTx, connection)
        await connection.confirmTransaction(sig1, 'confirmed')

        const reinitTx = new Transaction()
        reinitTx.add(new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: treasuryPDA,            isSigner: false, isWritable: true },
            { pubkey: publicKey,               isSigner: true,  isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: DISC_INITIALIZE,
        }))
        if (principalLamports > BigInt(0)) {
          reinitTx.add(new TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
              { pubkey: treasuryPDA,            isSigner: false, isWritable: true },
              { pubkey: getConfigPDA(),          isSigner: false, isWritable: false },
              { pubkey: publicKey,               isSigner: true,  isWritable: true },
              { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data: Buffer.from([...DISC_DEPOSIT, ...encodeLamports(principalLamports)]),
          }))
        }
        const sig2 = await sendTransaction(reinitTx, connection)
        await connection.confirmTransaction(sig2, 'confirmed')
        toast.success('Migration complete!', { description: `${Number(principalLamports) / 1e9} SOL restored. Checking for further upgrades…` })
        // V0→V1 done — re-run detection; V1→V2 upgrade may still be needed
        setTimeout(() => setDetectionTick(t => t + 1), 2000)
        setTimeout(() => refetch?.(), 2000)
        return

      } else if (info.data.length === V1_ACCOUNT_SIZE) {
        // V1 → in-place resize to V2, then V2 → V3 (two upgrades chained)
        const migrateTx = new Transaction().add(new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: treasuryPDA,            isSigner: false, isWritable: true },
            { pubkey: publicKey,               isSigner: true,  isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: DISC_MIGRATE_V2,
        }))
        const sig1 = await sendTransaction(migrateTx, connection)
        await connection.confirmTransaction(sig1, 'confirmed')
        // Now upgrade V2 → V3
        const migrateTx2 = new Transaction().add(new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: treasuryPDA,            isSigner: false, isWritable: true },
            { pubkey: publicKey,               isSigner: true,  isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: DISC_MIGRATE_V3,
        }))
        const sig2 = await sendTransaction(migrateTx2, connection)
        await connection.confirmTransaction(sig2, 'confirmed')
        toast.success('Account upgraded!', { description: 'Treasury is now on the latest layout.' })
      } else if (info.data.length === V2_ACCOUNT_SIZE) {
        // V2 → in-place resize to V3 (adds spending controls)
        const migrateTx = new Transaction().add(new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: treasuryPDA,            isSigner: false, isWritable: true },
            { pubkey: publicKey,               isSigner: true,  isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: DISC_MIGRATE_V3,
        }))
        const sig = await sendTransaction(migrateTx, connection)
        await connection.confirmTransaction(sig, 'confirmed')
        toast.success('Account upgraded!', { description: 'Treasury now supports spending controls.' })
      }

      setNeedsMigration(null)
      setDetectionTick(t => t + 1)
      setTimeout(() => refetch?.(), 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('Migration failed', { description: msg.slice(0, 120) })
    } finally {
      setMigrating(false)
    }
  }

  const shortWallet = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
    : '—'

  async function handleCopyAddress() {
    if (!publicKey) return
    await navigator.clipboard.writeText(publicKey.toBase58())
    toast.success('Wallet address copied')
  }

  async function handleClose() {
    if (!publicKey) return
    const confirmMsg = isMarinade
      ? 'Unstake all mSOL via Marinade (instant, ~0.3% fee) and close treasury? This cannot be undone.'
      : 'Close treasury and withdraw all SOL? This cannot be undone.'
    if (!confirm(confirmMsg)) return
    setClosing(true)
    try {
      const [treasuryPDA] = getTreasuryPDA(publicKey)
      let tx: Transaction

      if (isMarinade) {
        const treasuryMsolAta = getMsolAta(treasuryPDA)
        tx = new Transaction().add(new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: treasuryPDA,                  isSigner: false, isWritable: true  },
            { pubkey: publicKey,                    isSigner: true,  isWritable: true  },
            { pubkey: MSOL_MINT,                    isSigner: false, isWritable: true  },
            { pubkey: treasuryMsolAta,              isSigner: false, isWritable: true  },
            { pubkey: MARINADE_STATE,               isSigner: false, isWritable: true  },
            { pubkey: LIQ_POOL_SOL_LEG_PDA,        isSigner: false, isWritable: true  },
            { pubkey: LIQ_POOL_MSOL_LEG,           isSigner: false, isWritable: true  },
            { pubkey: new PublicKey('8ZUcztoAEhpAeC2ixWewJKQJsSUGYSGPVAjkhDJYf5Gd'), isSigner: false, isWritable: true }, // treasury_msol_leg
            { pubkey: MARINADE_PROGRAM_ID,          isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID,             isSigner: false, isWritable: false },
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,  isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId,      isSigner: false, isWritable: false },
          ],
          data: DISC_WITHDRAW_MARINADE,
        }))
      } else {
        tx = new Transaction().add(new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: treasuryPDA, isSigner: false, isWritable: true },
            { pubkey: publicKey,   isSigner: true,  isWritable: true },
          ],
          data: DISC_CLOSE_TREASURY,
        }))
      }

      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      toast.success('Treasury closed', { description: 'All SOL returned to your wallet.' })
      setNeedsMigration(null)
      setTimeout(() => refetch?.(), 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('Close failed', { description: msg.slice(0, 120) })
    } finally {
      setClosing(false)
    }
  }

  async function handleDeposit() {
    if (!publicKey) return
    const amount = parseFloat(solAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid SOL amount')
      return
    }

    setDepositing(true)
    try {
      const lamports = BigInt(Math.round(amount * 1_000_000_000))
      const [treasuryPDA] = getTreasuryPDA(publicKey)
      const tx = new Transaction()

      const accountInfo = await connection.getAccountInfo(treasuryPDA)
      if (!accountInfo) {
        tx.add(new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: treasuryPDA,               isSigner: false, isWritable: true },
            { pubkey: publicKey,                  isSigner: true,  isWritable: true },
            { pubkey: SystemProgram.programId,    isSigner: false, isWritable: false },
          ],
          data: DISC_INITIALIZE,
        }))
      } else if (accountInfo.data.length === V0_ACCOUNT_SIZE) {
        toast.error('Account migration required', { description: 'Click "Migrate account" above before depositing.' })
        return
      } else if (accountInfo.data.length === V1_ACCOUNT_SIZE) {
        const principal = (accountInfo.data as Buffer).readBigUInt64LE(40)
        setOldPrincipalSol(Number(principal) / 1e9)
        setNeedsMigration('v1')
        toast.error('Account upgrade required', { description: 'Click "Upgrade account" above to upgrade your treasury layout first.' })
        return
      } else if (accountInfo.data.length === V2_ACCOUNT_SIZE) {
        setNeedsMigration('v2')
        toast.error('Account upgrade required', { description: 'Click "Upgrade account" above to unlock spending controls.' })
        return
      }

      if (isMarinade) {
        const treasuryMsolAta = getMsolAta(treasuryPDA)
        // Account order must match IDL exactly:
        // treasury, config, owner, msol_mint, treasury_msol_account,
        // marinade_state, liq_pool_sol_leg_pda, liq_pool_msol_leg,
        // liq_pool_msol_leg_authority, reserve_pda, msol_mint_authority,
        // marinade_program, token_program, associated_token_program, system_program, rent
        tx.add(new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: treasuryPDA,                  isSigner: false, isWritable: true  },
            { pubkey: getConfigPDA(),               isSigner: false, isWritable: false },
            { pubkey: publicKey,                    isSigner: true,  isWritable: true  },
            { pubkey: MSOL_MINT,                    isSigner: false, isWritable: true  },
            { pubkey: treasuryMsolAta,              isSigner: false, isWritable: true  },
            { pubkey: MARINADE_STATE,               isSigner: false, isWritable: true  },
            { pubkey: LIQ_POOL_SOL_LEG_PDA,        isSigner: false, isWritable: true  },
            { pubkey: LIQ_POOL_MSOL_LEG,           isSigner: false, isWritable: true  },
            { pubkey: LIQ_POOL_MSOL_LEG_AUTHORITY, isSigner: false, isWritable: false },
            { pubkey: RESERVE_PDA,                  isSigner: false, isWritable: true  },
            { pubkey: MSOL_MINT_AUTHORITY,          isSigner: false, isWritable: false },
            { pubkey: MARINADE_PROGRAM_ID,          isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID,             isSigner: false, isWritable: false },
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,  isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId,      isSigner: false, isWritable: false },
            { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
          ],
          data: Buffer.from([...DISC_DEPOSIT_MARINADE, ...encodeLamports(lamports)]),
        }))
      } else {
        tx.add(new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: treasuryPDA,               isSigner: false, isWritable: true },
            { pubkey: getConfigPDA(),             isSigner: false, isWritable: false },
            { pubkey: publicKey,                  isSigner: true,  isWritable: true },
            { pubkey: SystemProgram.programId,    isSigner: false, isWritable: false },
          ],
          data: Buffer.from([...DISC_DEPOSIT, ...encodeLamports(lamports)]),
        }))
      }

      const sig = await sendTransaction(tx, connection)
      toast.success('Deposit sent!', {
        description: sig.slice(0, 8) + '…',
        action: {
          label: 'View',
          onClick: () => window.open(`https://explorer.solana.com/tx/${sig}?cluster=devnet`, '_blank'),
        },
      })
      setTimeout(() => refetch?.(), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('Deposit failed', { description: msg.slice(0, 120) })
    } finally {
      setDepositing(false)
    }
  }

  function encodeSettings(maxPerReq: bigint, dailyLimit: bigint): Uint8Array {
    const buf = new ArrayBuffer(16)
    const view = new DataView(buf)
    view.setBigUint64(0, maxPerReq, true)
    view.setBigUint64(8, dailyLimit, true)
    return new Uint8Array(buf)
  }

  function encodeBoolean(val: boolean): Uint8Array {
    return new Uint8Array([val ? 1 : 0])
  }

  async function handleSaveSettings() {
    if (!publicKey) return
    setSavingSettings(true)
    try {
      const [treasuryPDA] = getTreasuryPDA(publicKey)
      const maxPerReqLamports = settingsMaxPerReq
        ? BigInt(Math.round(parseFloat(settingsMaxPerReq) * 1_000_000_000))
        : BigInt(0)
      const dailyLimitLamports = settingsDailyLimit
        ? BigInt(Math.round(parseFloat(settingsDailyLimit) * 1_000_000_000))
        : BigInt(0)
      const tx = new Transaction().add(new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: treasuryPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey,   isSigner: true,  isWritable: false },
        ],
        data: Buffer.from([...DISC_SET_USER_SETTINGS, ...encodeSettings(maxPerReqLamports, dailyLimitLamports)]),
      }))
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      toast.success('Settings saved')
      setShowSettings(false)
      setTimeout(() => refetch?.(), 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('Failed to save settings', { description: msg.slice(0, 120) })
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleTogglePause() {
    if (!publicKey || !treasury) return
    const newPaused = !treasury.isPaused
    setTogglingPause(true)
    try {
      const [treasuryPDA] = getTreasuryPDA(publicKey)
      const tx = new Transaction().add(new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: treasuryPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey,   isSigner: true,  isWritable: false },
        ],
        data: Buffer.from([...DISC_SET_PAUSED, ...encodeBoolean(newPaused)]),
      }))
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      toast.success(newPaused ? 'Treasury paused — agent cannot deduct yield' : 'Treasury unpaused')
      setTimeout(() => refetch?.(), 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('Failed to toggle pause', { description: msg.slice(0, 120) })
    } finally {
      setTogglingPause(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-3xl border-primary/10 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold">Treasury</CardTitle>
            <div className="flex items-center gap-2">
              {treasury && !needsMigration && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(s => !s)}
                  className="h-7 w-7 rounded-xl p-0 text-muted-foreground hover:text-foreground"
                  title="Spending controls"
                >
                  <Settings2 className="size-3.5" />
                </Button>
              )}
              <Badge
                variant="secondary"
                className="rounded-full border-primary/20 bg-primary/10 text-primary text-xs"
              >
                {shortWallet}
              </Badge>
            </div>
          </div>
          <CardDescription className="text-xs">Your personal onchain vault</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-0">
          <Separator className="mb-3 bg-primary/10" />

          {needsMigration === 'v1' && (
            <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="size-4 shrink-0 text-yellow-400" />
                <p className="text-xs font-medium text-yellow-400">Account layout upgrade required</p>
              </div>
              <p className="text-xs text-muted-foreground">
                One-time in-place resize — no SOL lost, no re-deposit needed. Required before Marinade deposits.
              </p>
              <Button
                size="sm"
                onClick={handleMigrate}
                disabled={migrating}
                className="h-8 rounded-xl bg-yellow-500/20 text-xs font-semibold text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/20"
              >
                <RefreshCwIcon className={`mr-1.5 size-3 ${migrating ? 'animate-spin' : ''}`} />
                {migrating ? 'Upgrading…' : 'Upgrade account'}
              </Button>
            </div>
          )}

          {needsMigration === 'v2' && (
            <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="size-4 shrink-0 text-blue-400" />
                <p className="text-xs font-medium text-blue-400">New features available</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Upgrade your treasury to unlock per-request caps, daily spending limits, and pause controls.
              </p>
              <Button
                size="sm"
                onClick={handleMigrate}
                disabled={migrating}
                className="h-8 rounded-xl bg-blue-500/20 text-xs font-semibold text-blue-300 hover:bg-blue-500/30 border border-blue-500/20"
              >
                <RefreshCwIcon className={`mr-1.5 size-3 ${migrating ? 'animate-spin' : ''}`} />
                {migrating ? 'Upgrading…' : 'Upgrade account'}
              </Button>
            </div>
          )}

          {needsMigration === 'v0' && (
            <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="size-4 shrink-0 text-yellow-400" />
                <p className="text-xs font-medium text-yellow-400">Account upgrade required</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Your treasury ({oldPrincipalSol} SOL) uses a legacy layout. Migration closes and recreates the account — your principal will be fully restored.
              </p>
              <Button
                size="sm"
                onClick={handleMigrate}
                disabled={migrating}
                className="h-8 rounded-xl bg-yellow-500/20 text-xs font-semibold text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/20"
              >
                <RefreshCwIcon className={`mr-1.5 size-3 ${migrating ? 'animate-spin' : ''}`} />
                {migrating ? 'Migrating…' : 'Migrate account'}
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-full rounded-xl" />
              <Skeleton className="h-5 w-4/5 rounded-xl" />
              <Skeleton className="h-5 w-3/5 rounded-xl" />
            </div>
          ) : treasury ? (
            <>
              <StatRow
                label="Principal locked"
                value={`${treasury.principalSol.toFixed(4)} SOL`}
                sub="Permanently locked"
              />
              <Separator className="bg-primary/5" />
              <StatRow
                label="Available yield"
                value={`${treasury.availableYieldSol.toFixed(6)} SOL`}
                sub="Ready to spend on AI"
              />
              <Separator className="bg-primary/5" />
              <StatRow
                label="Total yield spent"
                value={`${treasury.totalYieldSpentSol.toFixed(6)} SOL`}
              />
              <Separator className="bg-primary/5" />
              <StatRow
                label="Staking APY"
                value={isMarinade ? '~6–7%' : '~8%'}
                sub={isMarinade ? 'Marinade Finance' : 'Simulated'}
              />
            </>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">No treasury found.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Deposit SOL below to initialize your vault.
              </p>
            </div>
          )}

          {/* Spending controls panel */}
          {showSettings && treasury && (
            <div className="mt-3 rounded-2xl border border-primary/15 bg-primary/5 p-3 flex flex-col gap-3">
              <p className="text-xs font-semibold text-foreground">Spending Controls</p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Per-request cap (SOL) — 0 = unlimited</label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={settingsMaxPerReq}
                  onChange={e => setSettingsMaxPerReq(e.target.value)}
                  placeholder={treasury.maxPerRequestSol != null ? String(treasury.maxPerRequestSol) : '0 (unlimited)'}
                  className="h-8 rounded-xl border-primary/20 bg-primary/5 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Daily spending limit (SOL) — 0 = unlimited</label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={settingsDailyLimit}
                  onChange={e => setSettingsDailyLimit(e.target.value)}
                  placeholder={treasury.dailyLimitSol != null ? String(treasury.dailyLimitSol) : '0 (unlimited)'}
                  className="h-8 rounded-xl border-primary/20 bg-primary/5 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="h-8 flex-1 rounded-xl bg-primary text-xs font-semibold"
                >
                  {savingSettings ? 'Saving…' : 'Save limits'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTogglePause}
                  disabled={togglingPause}
                  className={`h-8 rounded-xl text-xs font-semibold border ${
                    treasury.isPaused
                      ? 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                      : 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
                  }`}
                >
                  {togglingPause ? '…' : treasury.isPaused
                    ? <><PlayCircle className="mr-1 size-3" />Unpause</>
                    : <><PauseCircle className="mr-1 size-3" />Pause</>
                  }
                </Button>
              </div>
              {treasury.isPaused && (
                <p className="text-xs text-destructive/80">Treasury is paused — agent cannot deduct yield.</p>
              )}
            </div>
          )}

          {/* Deposit controls */}
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                type="number"
                min="0.001"
                step="0.1"
                value={solAmount}
                onChange={(e) => setSolAmount(e.target.value)}
                placeholder="SOL amount"
                className="h-9 rounded-xl border-primary/20 bg-primary/5 text-sm"
              />
              <Button
                size="sm"
                onClick={handleDeposit}
                disabled={depositing || !publicKey}
                className="h-9 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_4px_16px_color-mix(in_oklch,var(--primary)_40%,transparent)] hover:bg-primary/90 disabled:opacity-50"
              >
                <ArrowDownToLine className="mr-1.5 size-3.5" />
                {depositing ? 'Sending…' : 'Deposit'}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAddress}
              disabled={!publicKey}
              className="h-9 w-full rounded-xl border-primary/20 bg-primary/5 text-sm hover:border-primary/35 hover:bg-primary/10"
            >
              <Copy className="mr-1.5 size-3.5" />
              Copy wallet address
            </Button>
            {publicKey && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const [pda] = getTreasuryPDA(publicKey)
                  window.open(`https://explorer.solana.com/address/${pda.toBase58()}?cluster=devnet`, '_blank')
                }}
                className="h-9 w-full rounded-xl border-primary/20 bg-primary/5 text-sm hover:border-primary/35 hover:bg-primary/10"
              >
                <ExternalLink className="mr-1.5 size-3.5" />
                View treasury on Explorer
              </Button>
            )}
            {treasury && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={closing || !publicKey}
                className="h-9 w-full rounded-xl border-destructive/20 bg-destructive/5 text-sm text-destructive hover:border-destructive/40 hover:bg-destructive/10"
              >
                {closing ? 'Closing…' : 'Close & withdraw all SOL'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Yield bar */}
      {treasury && treasury.principalSol > 0 && (
        <Card className="rounded-3xl border-primary/10 bg-card/60 backdrop-blur-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Yield used</span>
              <span>
                {(
                  (treasury.totalYieldSpentSol /
                    Math.max(treasury.totalYieldSpentSol + treasury.availableYieldSol, 0.000001)) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{
                  width: `${Math.min(
                    (treasury.totalYieldSpentSol /
                      Math.max(treasury.totalYieldSpentSol + treasury.availableYieldSol, 0.000001)) *
                      100,
                    100
                  )}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
