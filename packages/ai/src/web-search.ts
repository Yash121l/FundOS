/**
 * Web search utility for AI agents.
 * Supports Tavily (preferred — designed for AI agents) and Serper (Google).
 * Falls back gracefully when no key is configured.
 */

export interface SearchResult {
  title: string
  url: string
  content: string
  publishedDate?: string
}

export interface WebSearchResponse {
  query: string
  results: SearchResult[]
  provider: 'tavily' | 'serper' | 'none'
  error?: string
}

async function searchTavily(query: string): Promise<WebSearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error('TAVILY_API_KEY not set')

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: false,
    }),
  })

  if (!res.ok) throw new Error(`Tavily error ${res.status}: ${await res.text()}`)

  const data = await res.json() as {
    results: Array<{ title: string; url: string; content: string; published_date?: string }>
  }

  return {
    query,
    provider: 'tavily',
    results: (data.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      publishedDate: r.published_date,
    })),
  }
}

async function searchSerper(query: string): Promise<WebSearchResponse> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new Error('SERPER_API_KEY not set')

  const res = await fetch('https://google.serper.dev/news', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
    body: JSON.stringify({ q: query, num: 5 }),
  })

  if (!res.ok) throw new Error(`Serper error ${res.status}: ${await res.text()}`)

  const data = await res.json() as {
    news?: Array<{ title: string; link: string; snippet: string; date?: string }>
  }

  return {
    query,
    provider: 'serper',
    results: (data.news ?? []).map((r) => ({
      title: r.title,
      url: r.link,
      content: r.snippet,
      publishedDate: r.date,
    })),
  }
}

export async function searchWeb(query: string): Promise<WebSearchResponse> {
  // Try Tavily first (AI-optimized), then Serper (Google news)
  if (process.env.TAVILY_API_KEY) {
    try {
      return await searchTavily(query)
    } catch (err) {
      console.error('[web-search] Tavily failed:', err instanceof Error ? err.message : err)
    }
  }

  if (process.env.SERPER_API_KEY) {
    try {
      return await searchSerper(query)
    } catch (err) {
      console.error('[web-search] Serper failed:', err instanceof Error ? err.message : err)
    }
  }

  return {
    query,
    provider: 'none',
    results: [],
    error: 'No web search API key configured. Add TAVILY_API_KEY or SERPER_API_KEY to enable live search.',
  }
}

export function isWebSearchConfigured(): boolean {
  return !!(process.env.TAVILY_API_KEY || process.env.SERPER_API_KEY)
}

export function formatSearchResults(response: WebSearchResponse): string {
  if (response.error || response.results.length === 0) {
    return `No web search results available. ${response.error ?? ''}`
  }
  return response.results
    .map((r, i) => {
      const date = r.publishedDate ? ` (${r.publishedDate})` : ''
      return `[${i + 1}] **${r.title}**${date}\nURL: ${r.url}\n${r.content}`
    })
    .join('\n\n')
}
