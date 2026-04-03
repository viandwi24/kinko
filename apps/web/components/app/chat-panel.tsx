'use client'

import { useState, useRef, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { SendIcon, BotIcon, UserIcon, ExternalLinkIcon, ShieldOffIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { sendChat, type ChatResponse } from '@/lib/api'
import { useAgentHealth } from '@/hooks/use-agent'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  receipt?: Pick<ChatResponse, 'yield_spent' | 'remaining_yield' | 'tx_hash' | 'model'>
}

export function ChatPanel() {
  const { publicKey } = useWallet()
  const { token, isAuthenticated, isLoggingIn, login, wallet: authWallet } = useAuth()
  const queryClient = useQueryClient()
  const { data: health } = useAgentHealth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const mutation = useMutation({
    mutationFn: ({ query, token }: { query: string; token: string }) =>
      sendChat(query, token, model.trim() || undefined),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.result,
          receipt: {
            yield_spent: data.yield_spent,
            remaining_yield: data.remaining_yield,
            tx_hash: data.tx_hash,
            model: data.model,
          },
        },
      ])
      // Invalidate treasury cache so balance updates
      if (authWallet) queryClient.invalidateQueries({ queryKey: ['treasury', authWallet] })
    },
    onError: (err: Error & { code?: string; status?: number }) => {
      if (err.status === 401) {
        toast.error('Session expired', {
          description: 'Your session has expired. Reconnect your wallet to sign in again.',
        })
      } else if (err.status === 404 || err.code === 'treasury_not_found') {
        toast.error('No treasury found', {
          description: 'You need to deposit SOL first to create your treasury. Go to the Fund tab.',
        })
      } else if (err.status === 402 && err.code === 'insufficient_yield') {
        toast.error('Not enough yield', {
          description: 'Your yield balance is too low. Deposit more SOL or wait for yield to accumulate.',
        })
      } else if (err.status === 402) {
        toast.error('Payment required', {
          description: err.message,
        })
      } else {
        toast.error('Request failed', { description: err.message })
      }
    },
  })

  function handleSend() {
    const query = input.trim()
    if (!query || !token || mutation.isPending) return

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content: query },
    ])
    setInput('')
    mutation.mutate({ query, token })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isOnline = health?.status === 'ok'
  const canChat = isAuthenticated && !!token

  return (
    <Card className="flex flex-col rounded-3xl border-primary/10 bg-card/60 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">Kinko Agent</CardTitle>
          <div className="flex items-center gap-2">
            {canChat && (
              <Badge variant="secondary" className="gap-1 rounded-full border-green-500/20 bg-green-500/10 text-xs text-green-400">
                <span className="size-1.5 rounded-full bg-green-400" />
                Authenticated
              </Badge>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('size-1.5 rounded-full', isOnline ? 'bg-green-400' : 'bg-muted-foreground')} />
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-4 p-4" style={{ minHeight: '400px' }}>
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              {!publicKey ? (
                <>
                  <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted/40">
                    <ShieldOffIcon className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Connect your wallet to chat</p>
                </>
              ) : isLoggingIn ? (
                <>
                  <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                    <BotIcon className="size-6 text-primary animate-pulse" />
                  </div>
                  <p className="text-sm font-medium">Signing in…</p>
                  <p className="mt-1 text-xs text-muted-foreground">Approve the signature request in your wallet.</p>
                </>
              ) : !canChat ? (
                <>
                  <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted/40">
                    <ShieldOffIcon className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Session required</p>
                  <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={login}>
                    Sign in with wallet
                  </Button>
                </>
              ) : (
                <>
                  <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                    <BotIcon className="size-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Ask Kinko anything</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Each request deducts yield from your treasury.
                  </p>
                </>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              <div
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-xl',
                  msg.role === 'user' ? 'bg-primary/20' : 'bg-primary/10'
                )}
              >
                {msg.role === 'user' ? (
                  <UserIcon className="size-3.5 text-primary" />
                ) : (
                  <BotIcon className="size-3.5 text-primary" />
                )}
              </div>

              <div className="flex max-w-[80%] flex-col gap-1">
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/60 text-foreground'
                  )}
                >
                  {msg.content}
                </div>

                {msg.receipt && (
                  <div className="flex flex-wrap items-center gap-1.5 px-1">
                    {msg.receipt.model && (
                      <Badge
                        variant="secondary"
                        className="rounded-lg border-primary/15 bg-primary/5 text-xs text-muted-foreground font-mono"
                      >
                        {msg.receipt.model}
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className="rounded-lg border-primary/15 bg-primary/5 text-xs text-muted-foreground"
                    >
                      −{msg.receipt.yield_spent.toFixed(6)} SOL
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="rounded-lg border-primary/15 bg-primary/5 text-xs text-muted-foreground"
                    >
                      {msg.receipt.remaining_yield.toFixed(6)} left
                    </Badge>
                    {msg.receipt.tx_hash && (
                      <a
                        href={`https://explorer.solana.com/tx/${msg.receipt.tx_hash}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary/60 hover:text-primary transition-colors"
                      >
                        <ExternalLinkIcon className="size-3" />
                        tx
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {mutation.isPending && (
            <div className="flex gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <BotIcon className="size-3.5 text-primary" />
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <Skeleton className="h-4 w-48 rounded-xl" />
                <Skeleton className="h-4 w-32 rounded-xl" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <CardContent className="border-t border-primary/10 p-3">
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Model (e.g. openai/gpt-4o-mini) — leave blank for default"
            className="w-full rounded-xl border border-primary/15 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30"
          />
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Ask Kinko anything… (Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="min-h-9 resize-none rounded-2xl border-primary/15 bg-background/50 text-sm focus-visible:ring-primary/30"
              disabled={mutation.isPending || !canChat}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || mutation.isPending || !canChat}
              className="size-9 shrink-0 rounded-2xl bg-primary p-0 shadow-[0_4px_16px_color-mix(in_oklch,var(--primary)_35%,transparent)]"
            >
              <SendIcon className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
