'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchConfig, type ServerConfig } from '@/lib/api'

export function useServerConfig() {
  const query = useQuery<ServerConfig | null>({
    queryKey: ['server-config'],
    queryFn: fetchConfig,
    staleTime: 30_000, // cache 30s — operator switch adalah rare event
  })

  return {
    serverConfig: query.data ?? null,
    isLoading: query.isLoading,
  }
}
