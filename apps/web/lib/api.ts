/**
 * API client — semua fetch ke apps/server lewat sini.
 * Satu-satunya env var yang dibutuhkan web: NEXT_PUBLIC_AGENT_URL
 */
export const SERVER_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? 'http://localhost:3001'

export type TreasuryInfo = {
  principalSol: number
  availableYieldSol: number
  totalYieldSpentSol: number
  stakingProvider: 'simulated' | 'marinade'
  maxPerRequestSol: number | null
  dailyLimitSol: number | null
  daySpentSol: number | null
  isPaused: boolean | null
}

export type ChatResponse = {
  result: string
  model: string
  yield_spent: number
  remaining_yield: number
  tx_hash: string
  agent: string
}

export type AgentCard = {
  protocolVersion: string
  name: string
  description: string
  version: string
  url: string
  capabilities: string[]
  skills: { name: string; description: string }[]
}

export type AgentMetadata = {
  type: string
  name: string
  description: string
  services: { name: string; endpoint: string; version?: string }[]
  active: boolean
  registrations: { agentId: string; agentRegistry: string }[]
}

export async function fetchTreasury(wallet: string): Promise<TreasuryInfo | null> {
  const res = await fetch(`${SERVER_URL}/api/treasury/${wallet}`)
  if (!res.ok) return null
  return res.json()
}

export async function sendChat(query: string, token: string, model?: string): Promise<ChatResponse> {
  const res = await fetch(`${SERVER_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ query, ...(model ? { model } : {}) }),
  })
  const data = await res.json()
  if (!res.ok) throw Object.assign(new Error(data.message ?? 'Chat failed'), { code: data.error, status: res.status })
  return data
}

export async function fetchNonce(wallet: string): Promise<{ nonce: string; expiresAt: number }> {
  const res = await fetch(`${SERVER_URL}/api/auth/nonce?wallet=${wallet}`)
  if (!res.ok) throw new Error('Failed to fetch nonce')
  return res.json()
}

export async function loginWithSignature(
  wallet: string,
  signature: string,
  nonce: string
): Promise<{ token: string; wallet: string; expiresAt: number }> {
  const res = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, signature, nonce }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Login failed')
  return data
}

export async function fetchAgentCard(): Promise<AgentCard | null> {
  const res = await fetch(`${SERVER_URL}/.well-known/agent-card.json`)
  if (!res.ok) return null
  return res.json()
}

export async function fetchAgentMetadata(): Promise<AgentMetadata | null> {
  const res = await fetch(`${SERVER_URL}/.well-known/agent.json`)
  if (!res.ok) return null
  return res.json()
}

export async function fetchAgentHealth(): Promise<{ status: string; agent: string } | null> {
  const res = await fetch(`${SERVER_URL}/health`)
  if (!res.ok) return null
  return res.json()
}

export type ServerConfig = {
  programId: string
  rpcUrl: string
  agentAssetAddress: string
  agentKeypairPubkey: string
  stakingProvider: 'simulated' | 'marinade'
}

export async function fetchConfig(): Promise<ServerConfig | null> {
  const res = await fetch(`${SERVER_URL}/api/config`)
  if (!res.ok) return null
  return res.json()
}

export type AdminStats = {
  totalAccounts: number
  pausedAccounts: number
  totalPrincipalSol: number
  totalYieldSpentSol: number
}

export async function fetchAdminStats(): Promise<AdminStats | null> {
  const res = await fetch(`${SERVER_URL}/api/config/admin/stats`)
  if (!res.ok) return null
  return res.json()
}
