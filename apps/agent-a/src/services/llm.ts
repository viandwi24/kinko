import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const llmService = {
  async chat(query: string): Promise<string> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are Kinko, an AI agent running on Solana. Your operations are funded by the user\'s staking yield from Marinade Finance. Be helpful, concise, and mention relevant Solana/DeFi context when appropriate.',
        },
        { role: 'user', content: query },
      ],
      max_tokens: 1024,
    })

    return response.choices[0]?.message?.content ?? 'No response from AI.'
  },
}
