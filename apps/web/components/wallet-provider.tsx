'use client'

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { useServerConfig } from '@/hooks/use-agent'

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css'

const FALLBACK_RPC = 'https://api.devnet.solana.com'

function Inner({ children }: { children: React.ReactNode }) {
  const { data: config } = useServerConfig()
  const endpoint = config?.rpcUrl ?? FALLBACK_RPC

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  return <Inner>{children}</Inner>
}
