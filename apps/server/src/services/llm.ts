import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { config } from '../config.js'
import { fetchSolPriceViaA2A } from './a2a.js'

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

function getOpenRouter() {
  if (!config.openrouterApiKey) {
    throw new Error('OPENROUTER_API_KEY env var is not set.')
  }
  return createOpenRouter({ apiKey: config.openrouterApiKey })
}

export const llmService = {
  async chat(query: string, model?: string): Promise<string> {
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

    const openrouter = getOpenRouter()
    const resolvedModel = model ?? config.aiModel

    const { text } = await generateText({
      model: openrouter(resolvedModel),
      system: SYSTEM_PROMPT,
      prompt: context + query,
      maxTokens: 1024,
    })

    return text || 'No response from AI.'
  },
}
