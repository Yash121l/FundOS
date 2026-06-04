import OpenAI from 'openai'

let _client: OpenAI | null = null

export function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  if (!_client) _client = new OpenAI({ apiKey: key })
  return _client
}

// gpt-4o-mini: cheap + fast — classification, extraction, short outputs
// gpt-4o:      best prose quality — LP report sections, nuanced summaries
export const MODEL_FAST = 'gpt-4o-mini' as const
export const MODEL_SMART = 'gpt-4o' as const
