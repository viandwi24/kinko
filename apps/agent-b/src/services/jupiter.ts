/**
 * jupiter.ts — fetch SOL/USD price from Jupiter Price API v2
 * No API key required for public price endpoint.
 */

const SOL_MINT = 'So11111111111111111111111111111111111111112'
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

export type PriceData = {
  price: number
  source: string
  timestamp: number
}

export async function getSolPrice(): Promise<PriceData> {
  const url = `https://price.jup.ag/v6/price?ids=${SOL_MINT}&vsToken=${USDC_MINT}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    // 5s timeout via AbortSignal
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) throw new Error(`Jupiter price API error: ${res.status}`)

  const data = await res.json()
  const priceInfo = data.data?.[SOL_MINT]
  if (!priceInfo) throw new Error('SOL price not found in Jupiter response')

  return {
    price: priceInfo.price,
    source: 'Jupiter Price API v6',
    timestamp: Date.now(),
  }
}
