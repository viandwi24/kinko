'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'
import { SolanaWalletProvider } from '@/components/wallet-provider'
import { AuthProvider } from '@/contexts/auth-context'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000, retry: 1 },
    },
  }))

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <SolanaWalletProvider>
          <AuthProvider>
            {children}
            <Toaster position="bottom-right" />
          </AuthProvider>
        </SolanaWalletProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
