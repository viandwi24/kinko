import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { config } from '../config.js'
import { callSkillViaA2A } from './a2a.js'

const SYSTEM_PROMPT = `You are Kinko, an AI agent running on Solana. Your operations are funded by the user's staking yield.
Be helpful and concise. Mention relevant Solana/DeFi context when appropriate.
If you're given real-time data from a specialist agent, use it in your answer and mention the agent was paid via x402.`

// Skills that trigger A2A discovery
const PRICE_KEYWORDS = ['price', 'harga', 'how much', 'berapa', 'cost', 'worth', 'trading at', 'valued at']
const CRYPTO_PAIRS: { keywords: string[]; pair: string }[] = [
  { keywords: ['btc', 'bitcoin'], pair: 'BTCUSDT' },
  { keywords: ['eth', 'ethereum'], pair: 'ETHUSDT' },
  { keywords: ['sol', 'solana'], pair: 'SOLUSDT' },
  { keywords: ['bnb'], pair: 'BNBUSDT' },
  { keywords: ['xrp', 'ripple'], pair: 'XRPUSDT' },
  { keywords: ['doge', 'dogecoin'], pair: 'DOGEUSDT' },
  { keywords: ['ada', 'cardano'], pair: 'ADAUSDT' },
  { keywords: ['avax', 'avalanche'], pair: 'AVAXUSDT' },
  { keywords: ['matic', 'polygon'], pair: 'MATICUSDT' },
  { keywords: ['link', 'chainlink'], pair: 'LINKUSDT' },
]

function detectPriceQuery(query: string): { skill: string; body: Record<string, unknown> } | null {
  const lower = query.toLowerCase()
  const hasPriceKeyword = PRICE_KEYWORDS.some(k => lower.includes(k))
  if (!hasPriceKeyword) return null

  for (const { keywords, pair } of CRYPTO_PAIRS) {
    if (keywords.some(k => lower.includes(k))) {
      return { skill: 'price', body: { pair } }
    }
  }
  return null
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

    // Detect if query needs a specialist agent skill
    const priceQuery = detectPriceQuery(query)
    if (priceQuery) {
      try {
        const result = await callSkillViaA2A(priceQuery.skill, priceQuery.body)
        if (result) {
          context = `[Real-time data from "${result.agentName}" (${result.agentAddress.slice(0, 8)}…) via x402 payment (tx: ${result.paymentTx.slice(0, 12)}…)]\n${JSON.stringify(result.data, null, 2)}\n\n`
        } else {
          context = `[Note: No specialist agent found for skill "${priceQuery.skill}" — answering from general knowledge]\n\n`
        }
      } catch (err) {
        console.error('[a2a] skill fetch failed:', err)
        context = `[Note: Specialist agent call failed — answering from general knowledge]\n\n`
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
