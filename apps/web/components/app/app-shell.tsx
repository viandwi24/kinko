'use client'

import dynamic from 'next/dynamic'
import { useWallet } from '@solana/wallet-adapter-react'
import { TreasuryPanel } from './treasury-panel'

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false },
)
import { ChatPanel } from './chat-panel'

export function AppShell() {
  const { connected } = useWallet()

  return (
    <div className="flex flex-1 flex-col">
      {!connected ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Connect your wallet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect to view your treasury and start chatting with Kinko Agent.
            </p>
          </div>
          <WalletMultiButton />
        </div>
      ) : (
        <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-[360px_1fr]">
          <TreasuryPanel />
          <ChatPanel />
        </div>
      )}
    </div>
  )
}
