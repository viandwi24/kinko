'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchAgentCard, fetchAgentHealth, fetchAgentMetadata, fetchConfig, type AgentCard, type AgentMetadata, type ServerConfig } from '@/lib/api'

export type { AgentCard, AgentMetadata, ServerConfig }

export type AgentHealth = { status: string; agent: string }

export function useAgentCard() {
  return useQuery({
    queryKey: ['agent-card'],
    queryFn: fetchAgentCard,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useAgentHealth() {
  return useQuery({
    queryKey: ['agent-health'],
    queryFn: fetchAgentHealth,
    refetchInterval: 15_000,
    retry: false,
  })
}

export function useAgentMetadata() {
  return useQuery({
    queryKey: ['agent-metadata'],
    queryFn: fetchAgentMetadata,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useServerConfig() {
  return useQuery({
    queryKey: ['server-config'],
    queryFn: fetchConfig,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
}
