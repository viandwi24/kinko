import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { config } from '../config.js'
import { callSkillViaA2A } from './a2a.js'

const SYSTEM_PROMPT = `You are Kinko, an AI agent running on Solana. Your operations are funded by the user's staking yield.
Be helpful and concise. Mention relevant Solana/DeFi context when appropriate.
If you're given real-time data from a specialist agent, use it in your answer and mention the agent was paid via x402.`

// Skills that trigger A2A discovery
const SKILL_TRIGGERS: { skill: string; keywords: string[] }[] = [
  {
    skill: 'price',
    keywords: ['sol price', 'price of sol', 'how much is sol', 'solana price', 'sol/usd', 'current price'],
  },
]

function detectSkill(query: string): string | null {
  const lower = query.toLowerCase()
  for (const { skill, keywords } of SKILL_TRIGGERS) {
    if (keywords.some(k => lower.includes(k))) return skill
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
    const skill = detectSkill(query)
    if (skill) {
      try {
        const result = await callSkillViaA2A(skill)
        if (result) {
          context = `[Real-time data from "${result.agentName}" (${result.agentAddress.slice(0, 8)}…) via x402 payment (tx: ${result.paymentTx.slice(0, 12)}…)]\n${JSON.stringify(result.data, null, 2)}\n\n`
        } else {
          context = `[Note: No specialist agent found for skill "${skill}" in registry — answering from general knowledge]\n\n`
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
