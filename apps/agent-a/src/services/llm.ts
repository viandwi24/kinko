import OpenAI from 'openai'
import { fetchSolPriceViaA2A } from './a2a.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are Kinko, an AI agent running on Solana. Your operations are funded by the user's staking yield.
Be helpful and concise. Mention relevant Solana/DeFi context when appropriate.
If you're given real-time price data from a specialist agent, use it in your answer.`

function isPriceQuery(query: string): boolean {
  const lower = query.toLowerCase()
  return (
    lower.includes('sol price') ||
    lower.includes('price of sol') ||
    lower.includes('how much is sol') ||
    lower.includes('solana price') ||
    lower.includes('sol/usd') ||
    lower.includes('current price')
  )
}

export const llmService = {
  async chat(query: string): Promise<string> {
    let context = ''

    // Auto-hire Agent B for price queries (A2A via x402)
    if (isPriceQuery(query)) {
      try {
        const priceData = await fetchSolPriceViaA2A()
        context = `[Real-time data from specialist agent via x402 payment (tx: ${priceData.paymentTx.slice(0, 12)}…)]\nSOL price: $${priceData.price.toFixed(4)} USD (source: ${priceData.source})\n\n`
      } catch (err) {
        console.error('[a2a] price fetch failed:', err)
        context = '[Note: Real-time price data unavailable — Agent B unreachable]\n\n'
      }
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: context + query },
      ],
      max_tokens: 1024,
    })

    return response.choices[0]?.message?.content ?? 'No response from AI.'
  },
}
