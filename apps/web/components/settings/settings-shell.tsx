'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false },
)
import { useTreasury } from '@/hooks/use-treasury'
import { useAgentCard, useAgentHealth, useServerConfig } from '@/hooks/use-agent'
import { SERVER_URL } from '@/lib/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CopyIcon, CheckIcon, ExternalLinkIcon, WalletIcon, BotIcon, ZapIcon, CodeIcon, ShieldIcon, PauseCircle, PlayCircle } from 'lucide-react'

const PROGRAM_ID = new PublicKey('HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt')
const DISC_SET_USER_SETTINGS = Buffer.from([26, 175, 170, 93, 31, 136, 123, 56])
const DISC_SET_PAUSED        = Buffer.from([91, 60, 125, 192, 176, 225, 166, 218])

function getTreasuryPDA(owner: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury'), owner.toBuffer()],
    PROGRAM_ID,
  )
  return pda
}


function CopyField({ label, value, explorerLink = true }: { label: string; value: string; explorerLink?: boolean }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const short = value.length > 20 ? `${value.slice(0, 8)}…${value.slice(-8)}` : value

  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className="rounded-lg bg-primary/5 px-2.5 py-1 font-mono text-xs text-foreground">
          {short || '—'}
        </code>
        {value && (
          <>
            <button
              onClick={copy}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? <CheckIcon className="size-3.5 text-green-400" /> : <CopyIcon className="size-3.5" />}
            </button>
            {explorerLink && (
              <a
                href={`https://explorer.solana.com/address/${value}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <ExternalLinkIcon className="size-3.5" />
              </a>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, description }: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export function SettingsShell() {
  const { publicKey, connected, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { treasury, isLoading, refetch } = useTreasury()
  const { data: health } = useAgentHealth()
  const { data: serverConfig } = useServerConfig()
  const { data: agentCard } = useAgentCard()
  const [depositInput, setDepositInput] = useState('')
  const [maxPerReq, setMaxPerReq] = useState('')
  const [dailyLimit, setDailyLimit] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [togglingPause, setTogglingPause] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  const defaultTab = searchParams.get('tab') ?? 'agent'

  const wallet = publicKey?.toBase58() ?? ''
  const isOnline = health?.status === 'ok'

  // Pre-fill inputs from current treasury values when loaded
  useEffect(() => {
    if (treasury) {
      setMaxPerReq(treasury.maxPerRequestSol && treasury.maxPerRequestSol > 0 ? String(treasury.maxPerRequestSol) : '')
      setDailyLimit(treasury.dailyLimitSol && treasury.dailyLimitSol > 0 ? String(treasury.dailyLimitSol) : '')
    }
  }, [treasury?.maxPerRequestSol, treasury?.dailyLimitSol])

  function encodeU64Pair(a: bigint, b: bigint): Uint8Array {
    const buf = new ArrayBuffer(16)
    const view = new DataView(buf)
    view.setBigUint64(0, a, true)
    view.setBigUint64(8, b, true)
    return new Uint8Array(buf)
  }

  async function handleSaveSettings() {
    if (!publicKey) return
    setSavingSettings(true)
    try {
      const treasuryPDA = getTreasuryPDA(publicKey)
      const maxLamports = BigInt(maxPerReq ? Math.round(parseFloat(maxPerReq) * 1_000_000_000) : 0)
      const dailyLamports = BigInt(dailyLimit ? Math.round(parseFloat(dailyLimit) * 1_000_000_000) : 0)
      const tx = new Transaction().add(new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: treasuryPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey,   isSigner: true,  isWritable: false },
        ],
        data: Buffer.from([...DISC_SET_USER_SETTINGS, ...encodeU64Pair(maxLamports, dailyLamports)]),
      }))
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      toast.success('Spending limits saved')
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
      const treasuryPDA = getTreasuryPDA(publicKey)
      const tx = new Transaction().add(new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: treasuryPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey,   isSigner: true,  isWritable: false },
        ],
        data: Buffer.from([...DISC_SET_PAUSED, newPaused ? 1 : 0]),
      }))
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      toast.success(newPaused ? 'Treasury paused' : 'Treasury unpaused')
      setTimeout(() => refetch?.(), 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('Failed to toggle pause', { description: msg.slice(0, 120) })
    } finally {
      setTogglingPause(false)
    }
  }

  const estimatedYearlyYield = depositInput
    ? (parseFloat(depositInput) * 0.08).toFixed(4)
    : null
  const estimatedDailyBudget = depositInput
    ? ((parseFloat(depositInput) * 0.08) / 365).toFixed(6)
    : null

  if (!connected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">Connect your wallet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect to manage your treasury settings.
          </p>
        </div>
        <WalletMultiButton />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your treasury, view onchain addresses, and configure your agent.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-6 rounded-2xl bg-primary/5 border border-primary/10">
          <TabsTrigger value="agent" className="rounded-xl gap-1.5">
            <BotIcon className="size-3.5" />
            Agent
          </TabsTrigger>
          <TabsTrigger value="program" className="rounded-xl gap-1.5">
            <CodeIcon className="size-3.5" />
            Program
          </TabsTrigger>
          <TabsTrigger value="treasury" className="rounded-xl gap-1.5">
            <ShieldIcon className="size-3.5" />
            Treasury
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Agent ─────────────────────────────────────── */}
        <TabsContent value="agent" className="flex flex-col gap-4">

          {/* Agent status */}
          <Card className="rounded-3xl border-primary/10 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <SectionHeader
                icon={BotIcon}
                title={agentCard?.name ?? 'Kinko Agent'}
                description="Runtime status and identity"
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-0">
              <Separator className="mb-3 bg-primary/10" />
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant="secondary"
                  className={`rounded-full text-xs ${isOnline
                    ? 'border-green-500/20 bg-green-500/10 text-green-400'
                    : 'border-muted/20 bg-muted/10 text-muted-foreground'
                    }`}
                >
                  <span className={`mr-1.5 inline-block size-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-muted-foreground'}`} />
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <Separator className="bg-primary/5" />
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Server URL</span>
                <code className="rounded-lg bg-primary/5 px-2.5 py-1 font-mono text-xs text-foreground">
                  {SERVER_URL}
                </code>
              </div>
              <Separator className="bg-primary/5" />
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Network</span>
                <Badge variant="secondary" className="rounded-full border-primary/15 bg-primary/5 text-xs text-primary">
                  Devnet
                </Badge>
              </div>
              <Separator className="bg-primary/5" />
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">A2A Protocol</span>
                <Badge variant="secondary" className="rounded-lg border-primary/15 bg-primary/5 text-xs">
                  {agentCard?.protocolVersion ?? 'v0.3.0'}
                </Badge>
              </div>
              {agentCard?.version && (
                <>
                  <Separator className="bg-primary/5" />
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">Agent version</span>
                    <Badge variant="secondary" className="rounded-lg border-primary/15 bg-primary/5 text-xs">
                      v{agentCard.version}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Agent onchain identity */}
          <Card className="rounded-3xl border-primary/10 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <SectionHeader
                icon={ZapIcon}
                title="Onchain Identity"
                description="Metaplex Core Asset — agent registry"
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-0">
              <Separator className="mb-3 bg-primary/10" />
              <CopyField label="Agent asset address" value={serverConfig?.agentAssetAddress ?? ''} />
              <Separator className="bg-primary/5" />
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Explorer</span>
                {serverConfig?.agentAssetAddress ? (
                  <a
                    href={`https://www.metaplex.com/agents/${serverConfig.agentAssetAddress}?network=solana-devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    View on Metaplex <ExternalLinkIcon className="size-3" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* ─── Tab: Program ───────────────────────────────────── */}
        <TabsContent value="program" className="flex flex-col gap-4">

          {/* Anchor program */}
          <Card className="rounded-3xl border-primary/10 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <SectionHeader
                icon={CodeIcon}
                title="Anchor Program"
                description="kinko-treasury — deployed on Solana devnet"
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-0">
              <Separator className="mb-3 bg-primary/10" />
              {serverConfig ? (
                <>
                  <CopyField label="Program ID" value={serverConfig.programId} />
                  <Separator className="bg-primary/5" />
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">RPC</span>
                    <code className="rounded-lg bg-primary/5 px-2.5 py-1 font-mono text-xs text-foreground">
                      {serverConfig.rpcUrl.replace('https://', '').split('/')[0]}
                    </code>
                  </div>
                  <Separator className="bg-primary/5" />
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">Cluster</span>
                    <Badge variant="secondary" className="rounded-full border-primary/15 bg-primary/5 text-xs text-primary">
                      Devnet
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-3 py-2">
                  <Skeleton className="h-5 w-full rounded-xl" />
                  <Skeleton className="h-5 w-4/5 rounded-xl" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wallet + Treasury PDA */}
          <Card className="rounded-3xl border-primary/10 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <SectionHeader
                icon={WalletIcon}
                title="Your Addresses"
                description="Wallet and derived treasury PDA"
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-0">
              <Separator className="mb-3 bg-primary/10" />
              <CopyField label="Wallet" value={wallet} />
            </CardContent>
          </Card>

          {/* Treasury */}
          <Card className="rounded-3xl border-primary/10 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <SectionHeader
                icon={WalletIcon}
                title="Treasury"
                description="Your personal onchain vault"
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-0">
              <Separator className="mb-3 bg-primary/10" />

              {isLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-5 w-full rounded-xl" />
                  <Skeleton className="h-5 w-4/5 rounded-xl" />
                </div>
              ) : treasury ? (
                <>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">Principal locked</span>
                    <span className="text-sm font-semibold">{treasury.principalSol.toFixed(4)} SOL</span>
                  </div>
                  <Separator className="bg-primary/5" />
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">Available yield</span>
                    <span className="text-sm font-semibold text-primary">{treasury.availableYieldSol.toFixed(6)} SOL</span>
                  </div>
                  <Separator className="bg-primary/5" />
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">Total yield spent</span>
                    <span className="text-sm font-semibold">{treasury.totalYieldSpentSol.toFixed(6)} SOL</span>
                  </div>
                  <Separator className="bg-primary/5" />
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">Cost per request</span>
                    <Badge variant="secondary" className="rounded-lg bg-primary/5 border-primary/15 text-xs">
                      0.001 SOL
                    </Badge>
                  </div>
                </>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No treasury found. Initialize one by depositing SOL.
                </p>
              )}

              {/* Deposit estimator */}
              <Separator className="my-3 bg-primary/10" />
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Deposit estimator
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Amount in SOL"
                    value={depositInput}
                    onChange={(e) => setDepositInput(e.target.value)}
                    className="rounded-2xl border-primary/15 bg-background/50 text-sm"
                  />
                  <Button
                    className="shrink-0 rounded-2xl bg-primary px-5 font-semibold shadow-[0_4px_16px_color-mix(in_oklch,var(--primary)_30%,transparent)]"
                    disabled
                    title="Connect to devnet program to deposit"
                  >
                    Deposit
                  </Button>
                </div>
                {estimatedYearlyYield && (
                  <div className="flex flex-col gap-1 rounded-2xl border border-primary/10 bg-primary/5 p-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Estimated yield / year</span>
                      <span className="font-semibold text-foreground">{estimatedYearlyYield} SOL</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Daily AI budget</span>
                      <span className="font-semibold text-primary">{estimatedDailyBudget} SOL</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Requests per day</span>
                      <span className="font-semibold text-foreground">
                        ~{Math.floor((parseFloat(estimatedDailyBudget ?? '0') / 0.001))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* ─── Tab: Treasury ──────────────────────────────────── */}
        <TabsContent value="treasury" className="flex flex-col gap-4">

          {/* Spending limits */}
          <Card className="rounded-3xl border-primary/10 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <SectionHeader
                icon={ShieldIcon}
                title="Spending Limits"
                description="Control how much yield the agent can deduct per request and per day"
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Separator className="bg-primary/10" />

              {isLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-9 w-full rounded-xl" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              ) : treasury?.isPaused != null ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Per-request cap (SOL)
                    </label>
                    <p className="text-xs text-muted-foreground/70">Maximum yield the agent can deduct in a single request. Set 0 for unlimited.</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={maxPerReq}
                      onChange={e => setMaxPerReq(e.target.value)}
                      placeholder="0 (unlimited)"
                      className="h-9 rounded-xl border-primary/20 bg-primary/5 text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Daily spending limit (SOL)
                    </label>
                    <p className="text-xs text-muted-foreground/70">Total yield the agent can deduct within a rolling 24-hour window. Set 0 for unlimited.</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={dailyLimit}
                      onChange={e => setDailyLimit(e.target.value)}
                      placeholder="0 (unlimited)"
                      className="h-9 rounded-xl border-primary/20 bg-primary/5 text-sm"
                    />
                  </div>

                  <Button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="h-9 rounded-xl bg-primary text-sm font-semibold"
                  >
                    {savingSettings ? 'Saving…' : 'Save spending limits'}
                  </Button>
                </>
              ) : (
                <p className="py-2 text-sm text-muted-foreground">
                  No treasury found. Deposit SOL first to create your vault.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pause control */}
          <Card className="rounded-3xl border-primary/10 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <SectionHeader
                icon={PauseCircle}
                title="Agent Access"
                description="Pause or unpause the agent's ability to deduct yield from your treasury"
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Separator className="bg-primary/10" />

              {isLoading ? (
                <Skeleton className="h-9 w-full rounded-xl" />
              ) : treasury?.isPaused != null ? (
                <>
                  <div className="flex items-center justify-between rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">
                        Status: {' '}
                        <span className={treasury.isPaused ? 'text-destructive' : 'text-green-400'}>
                          {treasury.isPaused ? 'Paused' : 'Active'}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {treasury.isPaused
                          ? 'Agent cannot deduct yield from your treasury.'
                          : 'Agent can deduct yield normally.'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTogglePause}
                      disabled={togglingPause}
                      className={`h-9 rounded-xl text-sm font-semibold border ${
                        treasury.isPaused
                          ? 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
                      }`}
                    >
                      {togglingPause ? '…' : treasury.isPaused
                        ? <><PlayCircle className="mr-1.5 size-3.5" />Unpause</>
                        : <><PauseCircle className="mr-1.5 size-3.5" />Pause</>
                      }
                    </Button>
                  </div>
                </>
              ) : (
                <p className="py-2 text-sm text-muted-foreground">
                  No treasury found. Deposit SOL first to create your vault.
                </p>
              )}
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  )
}
