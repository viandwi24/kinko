'use client'

import { useAgentCard, useAgentHealth, useServerConfig } from '@/hooks/use-agent'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { BotIcon, ZapIcon, ActivityIcon, GlobeIcon, CodeIcon, ExternalLinkIcon, UsersIcon, WalletIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchAdminStats } from '@/lib/api'

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <Card className="rounded-3xl border-primary/10 bg-card/60 backdrop-blur-sm overflow-hidden">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div
            className="flex size-9 items-center justify-center rounded-2xl"
            style={{ background: `color-mix(in oklch, ${accent ?? 'var(--primary)'} 15%, transparent)` }}
          >
            <Icon
              className="size-4"
              style={{ color: accent ?? 'var(--primary)' }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardShell() {
  const { data: card, isLoading: cardLoading } = useAgentCard()
  const { data: health } = useAgentHealth()
  const { data: serverConfig, isLoading: configLoading } = useServerConfig()
  const { data: adminStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
    refetchInterval: 60_000,
  })

  const isOnline = health?.status === 'ok'

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-3xl bg-primary/10">
              <BotIcon className="size-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{card?.name ?? 'Kinko Agent'}</h1>
                <Badge
                  variant="secondary"
                  className={`rounded-full text-xs ${
                    isOnline
                      ? 'border-green-500/20 bg-green-500/10 text-green-400'
                      : 'border-muted/20 bg-muted/10 text-muted-foreground'
                  }`}
                >
                  <span className={`mr-1 inline-block size-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-muted-foreground'}`} />
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Registered as Metaplex Core Asset · Onchain identity
              </p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        {cardLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={ActivityIcon}
              label="Status"
              value={isOnline ? 'Active' : 'Offline'}
              accent={isOnline ? 'oklch(0.72 0.1 165)' : undefined}
            />
            <StatCard
              icon={ZapIcon}
              label="Version"
              value={card?.version ?? '—'}
              sub="Agent runtime"
              accent="var(--primary)"
            />
            <StatCard
              icon={GlobeIcon}
              label="Capabilities"
              value={card?.capabilities?.length ? card.capabilities.join(', ') : '—'}
              sub="Supported modes"
              accent="oklch(0.72 0.12 240)"
            />
            <StatCard
              icon={BotIcon}
              label="A2A Protocol"
              value="0.3.0"
              sub="Agent-to-Agent"
              accent="oklch(0.75 0.1 320)"
            />
          </div>
        )}

        {/* Agent + Program details */}
        <div className="grid gap-4 lg:grid-cols-2 mt-4">
          <Card className="rounded-3xl border-primary/10 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold">About</CardTitle>
              <CardDescription className="text-xs">Agent registration info</CardDescription>
            </CardHeader>
            <CardContent>
              {card ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-full rounded-xl" />
                  <Skeleton className="h-4 w-4/5 rounded-xl" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-primary/10 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Endpoints</CardTitle>
              <CardDescription className="text-xs">Service URLs</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {card ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Chat API</span>
                    <Badge variant="secondary" className="rounded-lg font-mono text-xs">
                      POST /api/chat
                    </Badge>
                  </div>
                  <Separator className="bg-primary/10" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Agent Card</span>
                    <Badge variant="secondary" className="rounded-lg font-mono text-xs">
                      GET /.well-known/agent-card.json
                    </Badge>
                  </div>
                  <Separator className="bg-primary/10" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Treasury</span>
                    <Badge variant="secondary" className="rounded-lg font-mono text-xs">
                      GET /api/treasury/:wallet
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-full rounded-xl" />
                  <Skeleton className="h-5 w-full rounded-xl" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {serverConfig?.agentAssetAddress && (
          <div className="mt-4 flex justify-end">
            <a
              href={`https://www.metaplex.com/agents/${serverConfig.agentAssetAddress}?network=solana-devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              View agent on Metaplex <ExternalLinkIcon className="size-3" />
            </a>
          </div>
        )}

        <Separator className="my-8 bg-primary/10" />

        {/* Program section */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
            <CodeIcon className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Smart Contract</h2>
            <p className="text-xs text-muted-foreground">kinko-treasury — Anchor program on Solana devnet</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {configLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-3xl" />
            ))
          ) : (
            <>
              <StatCard
                icon={CodeIcon}
                label="Program ID"
                value={serverConfig?.programId ? `${serverConfig.programId.slice(0, 6)}…${serverConfig.programId.slice(-4)}` : '—'}
                sub="Anchor program"
                accent="oklch(0.72 0.12 240)"
              />
              <StatCard
                icon={ZapIcon}
                label="Agent Asset"
                value={serverConfig?.agentAssetAddress ? `${serverConfig.agentAssetAddress.slice(0, 6)}…${serverConfig.agentAssetAddress.slice(-4)}` : '—'}
                sub="Metaplex Core"
                accent="oklch(0.75 0.1 320)"
              />
              <StatCard
                icon={GlobeIcon}
                label="Network"
                value="Devnet"
                sub={serverConfig?.rpcUrl.replace('https://', '').split('/')[0] ?? ''}
                accent="oklch(0.72 0.1 165)"
              />
            </>
          )}
        </div>

        <Separator className="my-8 bg-primary/10" />

        {/* Treasury stats */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
            <UsersIcon className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Treasury Stats</h2>
            <p className="text-xs text-muted-foreground">Aggregate across all user vaults</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-3xl" />
            ))
          ) : (
            <>
              <StatCard
                icon={UsersIcon}
                label="Total vaults"
                value={adminStats?.totalAccounts != null ? String(adminStats.totalAccounts) : '—'}
                sub="Active treasuries"
                accent="var(--primary)"
              />
              <StatCard
                icon={WalletIcon}
                label="Total principal"
                value={adminStats?.totalPrincipalSol != null ? `${adminStats.totalPrincipalSol.toFixed(3)} SOL` : '—'}
                sub="Locked across all vaults"
                accent="oklch(0.72 0.12 240)"
              />
              <StatCard
                icon={ZapIcon}
                label="Total yield spent"
                value={adminStats?.totalYieldSpentSol != null ? `${adminStats.totalYieldSpentSol.toFixed(6)} SOL` : '—'}
                sub="Paid to agent"
                accent="oklch(0.75 0.1 320)"
              />
              <StatCard
                icon={ActivityIcon}
                label="Paused vaults"
                value={adminStats?.pausedAccounts != null ? String(adminStats.pausedAccounts) : '—'}
                sub="Owner-paused"
                accent="oklch(0.72 0.1 165)"
              />
            </>
          )}
        </div>

        {serverConfig?.programId && (
          <div className="mt-4 flex justify-end">
            {/* <a
              href={`https://www.metaplex.com/agents/${serverConfig.agentAssetAddress}?network=solana-devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              View agent on Metaplex <ExternalLinkIcon className="size-3" />
            </a> */}
            {/* for program id is show in explorer, use solana.fm */}
            <a
              href={`https://solana.fm/address/${serverConfig.programId}?cluster=devnet-solana`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              View program on Solana.fm <ExternalLinkIcon className="size-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
