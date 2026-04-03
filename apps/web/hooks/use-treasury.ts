'use client'

import { useQuery } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { fetchTreasury } from '@/lib/api'

export function useTreasury() {
  const { publicKey, connected } = useWallet()
  const wallet = publicKey?.toBase58() ?? null

  const query = useQuery({
    queryKey: ['treasury', wallet],
    queryFn: () => fetchTreasury(wallet!),
    enabled: connected && wallet !== null,
    refetchInterval: 30_000, // refresh every 30s
  })

  return {
    treasury: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
