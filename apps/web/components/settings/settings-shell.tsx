'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useWallet } from '@solana/wallet-adapter-react'

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
import { CopyIcon, CheckIcon, ExternalLinkIcon, WalletIcon, BotIcon, ZapIcon, CodeIcon } from 'lucide-react'


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
  const { publicKey, connected } = useWallet()
  const { treasury, isLoading } = useTreasury()
  const { data: health } = useAgentHealth()
  const { data: serverConfig } = useServerConfig()
  const { data: agentCard } = useAgentCard()
  const [depositInput, setDepositInput] = useState('')

  const wallet = publicKey?.toBase58() ?? ''
  const isOnline = health?.status === 'ok'

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

      <Tabs defaultValue="agent">
        <TabsList className="mb-6 rounded-2xl bg-primary/5 border border-primary/10">
          <TabsTrigger value="agent" className="rounded-xl gap-1.5">
            <BotIcon className="size-3.5" />
            Agent
          </TabsTrigger>
          <TabsTrigger value="program" className="rounded-xl gap-1.5">
            <CodeIcon className="size-3.5" />
            Program
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
      </Tabs>
    </div>
  )
}
