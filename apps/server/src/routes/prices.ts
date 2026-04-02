/**
 * prices.ts — Kinko Prices sub-agent
 *
 * A second registered agent on the same server.
 * Serves its own agent-card.json + x402-protected price endpoint.
 *
 * Mounted at: /agents/prices
 * Agent card: /agents/prices/.well-known/agent-card.json
 * Price API:  /agents/prices/api/price
 */

import { Hono } from 'hono'
import { config } from '../config.js'

export const pricesRoute = new Hono()

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAYMENT_LAMPORTS = 10_000 // 0.00001 SOL per request

/** Normalize pair: BTC/USDT, btc-usdt, BTCUSDT → BTCUSDT */
function normalizePair(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

async function fetchBinancePrice(symbol: string): Promise<{ price: number; symbol: string }> {
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
    { signal: AbortSignal.timeout(5000) }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Binance API error for ${symbol}: ${(err as any).msg ?? res.status}`)
  }
  const data = await res.json() as { symbol: string; price: string }
  return { symbol: data.symbol, price: parseFloat(data.price) }
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

pricesRoute.get('/.well-known/agent-card.json', (c) => {
  const baseUrl = `${config.agentServiceUrl}/agents/prices`
  const assetAddress = process.env.KINKO_PRICES_ASSET_ADDRESS ?? ''
  return c.json({
    protocolVersion: '0.3.0',
    name: 'Kinko Prices',
    description: 'Real-time cryptocurrency price oracle. Fetches live prices from Binance for any trading pair. Paid via x402 micropayment.',
    version: '1.0.0',
    url: `${baseUrl}/api/price`,
    capabilities: ['x402'],
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['application/json'],
    registrations: assetAddress
      ? [{ agentId: assetAddress, agentRegistry: 'solana:101:metaplex' }]
      : [],
    skills: [
      {
        name: 'price',
        description: 'Get real-time price for any trading pair from Binance (e.g. BTCUSDT, ETH/USDT, SOL-USDC). Paid via x402.',
        tags: ['price', 'oracle', 'DeFi', 'Binance'],
        inputSchema: {
          type: 'object',
          properties: {
            pair: { type: 'string', description: 'Trading pair e.g. BTCUSDT, BTC/USDT, btc-usdt' },
          },
          required: ['pair'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            price: { type: 'number' },
            source: { type: 'string' },
            timestamp: { type: 'number' },
          },
        },
      },
    ],
  })
})

// ─── NFT Metadata ─────────────────────────────────────────────────────────────

pricesRoute.get('/.well-known/metadata.json', (c) => {
  const serverUrl = config.agentServiceUrl
  return c.json({
    name: 'Kinko Prices',
    description: 'Real-time crypto price oracle agent. Fetches live prices from Binance.',
    image: `${serverUrl}/.well-known/logo.png`,
    external_url: `${serverUrl}/agents/prices`,
    attributes: [
      { trait_type: 'Type', value: 'Price Oracle' },
      { trait_type: 'Network', value: 'Solana' },
      { trait_type: 'Version', value: '1.0.0' },
    ],
  })
})

// ─── ERC-8004 Agent Metadata ──────────────────────────────────────────────────

pricesRoute.get('/.well-known/agent.json', (c) => {
  const baseUrl = `${config.agentServiceUrl}/agents/prices`
  const assetAddress = process.env.KINKO_PRICES_ASSET_ADDRESS ?? ''
  return c.json({
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'Kinko Prices',
    description: 'Real-time cryptocurrency price oracle. Fetches live prices from Binance for any trading pair. Paid via x402 micropayment per request.',
    image: `${config.agentServiceUrl}/.well-known/logo.png`,
    services: [
      {
        name: 'A2A',
        endpoint: `${baseUrl}/.well-known/agent-card.json`,
        version: '0.3.0',
        skills: ['price'],
        domains: ['DeFi', 'price-oracle', 'Binance'],
      },
    ],
    active: true,
    registrations: assetAddress
      ? [{ agentId: assetAddress, agentRegistry: 'solana:101:metaplex' }]
      : [],
    supportedTrust: ['crypto-economic'],
  })
})

// ─── Price Endpoint (x402 protected) ─────────────────────────────────────────

pricesRoute.post('/api/price', async (c) => {
  const payment = c.req.header('X-Payment')

  // No payment — return 402 with requirements
  if (!payment) {
    return c.json(
      {
        error: 'payment_required',
        message: 'This endpoint requires an x402 micropayment.',
        x402: {
          payTo: config.agentKeypair.publicKey.toBase58(),
          maxAmountRequired: String(PAYMENT_LAMPORTS),
          asset: 'SOL',
          network: 'solana-devnet',
          description: `Pay ${PAYMENT_LAMPORTS} lamports to get real-time price data`,
        },
      },
      402
    )
  }

  // Payment provided — fetch price
  let pair = 'SOLUSDT'
  try {
    const body = await c.req.json<{ pair?: string }>()
    if (body.pair) pair = normalizePair(body.pair)
  } catch {
    // no body or invalid JSON — use default
  }

  try {
    const result = await fetchBinancePrice(pair)
    return c.json({
      symbol: result.symbol,
      price: result.price,
      source: 'Binance API',
      timestamp: Date.now(),
      paymentReceived: payment.slice(0, 16) + '…',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: 'price_fetch_failed', message }, 500)
  }
})
