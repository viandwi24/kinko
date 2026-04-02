/**
 * a2a.ts — Agent-to-Agent: Kinko discovers specialist agents via Metaplex registry,
 * then hires them via x402 micropayment protocol.
 *
 * Discovery:
 *   - Primary: Helius DAS API (getAssetsByOwner) if HELIUS_API_KEY is set
 *   - Fallback: known agents from env (KINKO_PRICES_ASSET_ADDRESS, etc.)
 *   Each discovered asset's service_endpoint attribute is fetched for agent-card.json,
 *   then filtered by skill name.
 *
 * x402 Payment flow:
 *   1. POST to skill endpoint without payment → 402 + requirements
 *   2. Pay from agent keypair → tx sig
 *   3. Retry with X-Payment: <txSig> header → result
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import { config } from '../config.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DiscoveredAgent = {
  assetAddress: string
  name: string
  skillEndpoint: string
  skill: string
}

export type A2AResult = {
  data: Record<string, unknown>
  paymentTx: string
  agentName: string
  agentAddress: string
}

// ─── Discovery ────────────────────────────────────────────────────────────────

/** Build candidate list from known env addresses + optional Helius DAS discovery */
async function discoverAgentsWithSkill(skill: string): Promise<DiscoveredAgent[]> {
  const candidates: { assetAddress: string; serviceEndpoint: string }[] = []

  // ── Known agents from env (always available, no Helius needed) ──────────────
  if (config.pricesAgentAssetAddress) {
    const baseUrl = `${config.agentServiceUrl}/agents/prices`
    candidates.push({
      assetAddress: config.pricesAgentAssetAddress,
      serviceEndpoint: baseUrl,
    })
  }

  // ── Helius DAS discovery (optional — finds any registered agent) ─────────────
  const heliusKey = process.env.HELIUS_API_KEY
  if (heliusKey) {
    try {
      const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${heliusKey}`
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'a2a-discovery',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: config.agentKeypair.publicKey.toBase58(),
            page: 1,
            limit: 50,
            displayOptions: { showFungible: false },
          },
        }),
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const json = await res.json()
        const items: any[] = json.result?.items ?? []
        for (const asset of items) {
          if (asset.interface !== 'MplCoreAsset') continue
          if (asset.id === config.agentAssetAddress) continue // skip self
          const attrs: { trait_type: string; value: string }[] = asset.content?.metadata?.attributes ?? []
          const endpoint = attrs.find(a => a.trait_type === 'service_endpoint')?.value
          if (!endpoint) continue
          // Avoid duplicates already in known list
          if (!candidates.some(c => c.assetAddress === asset.id)) {
            candidates.push({ assetAddress: asset.id, serviceEndpoint: endpoint })
          }
        }
      }
    } catch (err) {
      console.warn('[a2a] Helius DAS query failed (non-fatal):', err)
    }
  }

  if (candidates.length === 0) return []

  // ── Fetch agent-card.json for each candidate, filter by skill ───────────────
  const results: DiscoveredAgent[] = []
  for (const candidate of candidates) {
    try {
      const cardRes = await fetch(
        `${candidate.serviceEndpoint}/.well-known/agent-card.json`,
        { signal: AbortSignal.timeout(3000) }
      )
      if (!cardRes.ok) continue
      const card = await cardRes.json()
      const matchedSkill = card.skills?.find(
        (s: { name: string }) => s.name.toLowerCase().includes(skill.toLowerCase())
      )
      if (!matchedSkill) continue
      results.push({
        assetAddress: candidate.assetAddress,
        name: card.name ?? 'Unknown Agent',
        skillEndpoint: card.url ?? `${candidate.serviceEndpoint}/api/${skill}`,
        skill,
      })
    } catch {
      // unreachable, skip
    }
  }

  return results
}

// ─── x402 Payment Flow ────────────────────────────────────────────────────────

async function callAgentWithX402(
  agent: DiscoveredAgent,
  body: Record<string, unknown> = {}
): Promise<A2AResult> {
  // Step 1: probe without payment
  const probeRes = await fetch(agent.skillEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })

  if (probeRes.status !== 402) {
    const data = await probeRes.json()
    return { data, paymentTx: 'free', agentName: agent.name, agentAddress: agent.assetAddress }
  }

  const requirements = await probeRes.json()
  const payTo = requirements.x402?.payTo
  const amountLamports = parseInt(requirements.x402?.maxAmountRequired ?? '10000', 10)

  if (!payTo) throw new Error(`Agent ${agent.name} returned 402 but no payTo address`)

  // Step 2: pay
  const agentKeypair = config.agentKeypair
  const connection = new Connection(config.rpcUrl, 'confirmed')

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: agentKeypair.publicKey,
      toPubkey: new PublicKey(payTo),
      lamports: amountLamports,
    })
  )

  const txSig = await sendAndConfirmTransaction(connection, tx, [agentKeypair])
  console.log(`[a2a] paid ${amountLamports} lamports to ${agent.name} — tx: ${txSig}`)

  // Step 3: retry with payment proof
  const paidRes = await fetch(agent.skillEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment': txSig,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })

  if (!paidRes.ok) {
    const err = await paidRes.json().catch(() => ({}))
    throw new Error(`Agent ${agent.name} payment verification failed: ${(err as any).message ?? paidRes.status}`)
  }

  const data = await paidRes.json()
  return { data, paymentTx: txSig, agentName: agent.name, agentAddress: agent.assetAddress }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Discover agents with a given skill and call the first available one.
 * Returns null if no agents found or all unreachable.
 */
export async function callSkillViaA2A(
  skill: string,
  body: Record<string, unknown> = {}
): Promise<A2AResult | null> {
  const agents = await discoverAgentsWithSkill(skill)

  if (agents.length === 0) {
    console.log(`[a2a] no agents found for skill: ${skill}`)
    return null
  }

  console.log(`[a2a] discovered ${agents.length} agent(s) for skill "${skill}": ${agents.map(a => a.name).join(', ')}`)

  for (const agent of agents) {
    try {
      const result = await callAgentWithX402(agent, body)
      console.log(`[a2a] success from ${agent.name} (${agent.assetAddress})`)
      return result
    } catch (err) {
      console.warn(`[a2a] agent ${agent.name} failed:`, err)
    }
  }

  return null
}
