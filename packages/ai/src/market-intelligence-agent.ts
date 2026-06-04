import type { Company, MarketSignal } from '@fundos/types'
import { getOpenAIClient, MODEL_FAST } from './client'

export interface MarketIntelligenceInput {
  signal: MarketSignal
  portfolio: Pick<Company, 'id' | 'name' | 'sector' | 'description' | 'status'>[]
}

export interface MarketIntelligenceOutput {
  relevantCompanyIds: string[]
  relevanceExplanation: string
  perCompanyReasons: Record<string, string>
}

const SECTOR_KEYWORDS: Record<string, string[]> = {
  FINTECH: ['fintech', 'finance', 'financial', 'banking', 'payments', 'lending', 'credit', 'insurance', 'wealth', 'trading', 'embedded finance'],
  HEALTHTECH: ['health', 'healthcare', 'medical', 'clinical', 'hospital', 'pharma', 'biotech', 'diagnostics', 'patient', 'wellness'],
  SAAS: ['saas', 'software', 'b2b', 'enterprise', 'workflow', 'automation', 'platform', 'subscription'],
  AI: ['ai', 'artificial intelligence', 'machine learning', 'llm', 'generative', 'foundation model', 'neural'],
  DEVTOOLS: ['developer', 'devtools', 'dev tools', 'api', 'sdk', 'infrastructure', 'deployment', 'ci/cd', 'platform engineering'],
  CLIMATETECH: ['climate', 'carbon', 'sustainability', 'renewable', 'green', 'esg', 'emissions', 'net zero', 'cleantech'],
  MARKETPLACE: ['marketplace', 'two-sided', 'platform', 'network effect', 'gig', 'commerce'],
  INFRASTRUCTURE: ['infrastructure', 'cloud', 'datacenter', 'networking', 'security', 'observability'],
}

const REGULATION_SECTORS = new Set(['FINTECH', 'HEALTHTECH', 'AI'])

export class MarketIntelligenceAgent {
  async enrich(input: MarketIntelligenceInput): Promise<MarketIntelligenceOutput> {
    const client = getOpenAIClient()
    if (client) return this.enrichWithAI(input, client)
    return this.enrichRuleBased(input)
  }

  private async enrichWithAI(
    input: MarketIntelligenceInput,
    client: ReturnType<typeof getOpenAIClient> & {}
  ): Promise<MarketIntelligenceOutput> {
    const { signal, portfolio } = input
    const activeCompanies = portfolio.filter((c) => c.status === 'ACTIVE')

    if (activeCompanies.length === 0) {
      return { relevantCompanyIds: [], relevanceExplanation: 'No active portfolio companies.', perCompanyReasons: {} }
    }

    const companyList = activeCompanies
      .map((c) => `- ${c.name} (${c.sector}${c.description ? `: ${c.description.slice(0, 80)}` : ''})`)
      .join('\n')

    try {
      const response = await client.chat.completions.create({
        model: MODEL_FAST,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a VC analyst assessing market signal relevance for a portfolio. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: `Assess which portfolio companies are meaningfully affected by this market signal.

SIGNAL: ${signal.title}
CATEGORY: ${signal.category}
SUMMARY: ${signal.summary}

PORTFOLIO COMPANIES:
${companyList}

For each relevant company, explain why in one sentence. Only include companies with genuine relevance — not superficial sector overlap.

Respond with:
{
  "relevantCompanies": [
    { "name": "CompanyName", "reason": "Why this signal matters for them." }
  ]
}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 600,
      })

      const raw = JSON.parse(response.choices[0]?.message?.content ?? '{}') as {
        relevantCompanies?: Array<{ name: string; reason: string }>
      }

      const relevantIds: string[] = []
      const perCompanyReasons: Record<string, string> = {}

      for (const item of raw.relevantCompanies ?? []) {
        const company = activeCompanies.find(
          (c) => c.name.toLowerCase() === item.name.toLowerCase()
        )
        if (company) {
          relevantIds.push(company.id)
          perCompanyReasons[company.id] = item.reason
        }
      }

      const explanation = relevantIds.length > 0
        ? `Signal relevant to ${relevantIds.length} portfolio compan${relevantIds.length === 1 ? 'y' : 'ies'}.`
        : `No direct portfolio relevance detected for this signal.`

      return { relevantCompanyIds: relevantIds, relevanceExplanation: explanation, perCompanyReasons }
    } catch {
      return this.enrichRuleBased(input)
    }
  }

  private async enrichRuleBased(input: MarketIntelligenceInput): Promise<MarketIntelligenceOutput> {
    const { signal, portfolio } = input
    const text = `${signal.title} ${signal.summary}`.toLowerCase()

    const relevantIds: string[] = []
    const perCompanyReasons: Record<string, string> = {}

    for (const company of portfolio) {
      if (company.status !== 'ACTIVE') continue
      const result = this.isRelevant(signal.category, text, company)
      if (result.matched) {
        relevantIds.push(company.id)
        perCompanyReasons[company.id] = result.reason
      }
    }

    const explanation = relevantIds.length > 0
      ? `Signal relevant to ${relevantIds.length} portfolio compan${relevantIds.length === 1 ? 'y' : 'ies'}.`
      : `No direct portfolio relevance detected for this signal.`

    return { relevantCompanyIds: relevantIds, relevanceExplanation: explanation, perCompanyReasons }
  }

  private isRelevant(
    category: string,
    text: string,
    company: Pick<Company, 'id' | 'name' | 'sector' | 'description' | 'status'>
  ): { matched: boolean; reason: string } {
    const { sector } = company
    const keywords = SECTOR_KEYWORDS[sector] ?? []
    const desc = (company.description ?? '').toLowerCase()
    const matchesKw = (str: string, kw: string) =>
      kw.length <= 2 ? new RegExp(`\\b${kw}\\b`, 'i').test(str) : str.includes(kw)
    const textMatchesSector = keywords.some((kw) => matchesKw(text, kw))
    const descMatchesText = keywords.some((kw) => matchesKw(desc, kw) && matchesKw(text, kw))

    if (category === 'REGULATION') {
      if (REGULATION_SECTORS.has(sector) && textMatchesSector) {
        return { matched: true, reason: `Regulatory signal directly impacts ${company.name}'s ${sector} operations.` }
      }
      if (textMatchesSector || descMatchesText) {
        return { matched: true, reason: `Signal regulation overlaps with ${company.name}'s market.` }
      }
      return { matched: false, reason: '' }
    }

    if (category === 'FUNDING_NEWS') {
      if (textMatchesSector) {
        return { matched: true, reason: `Funding in ${sector} sector signals competitive dynamics for ${company.name}.` }
      }
      return { matched: false, reason: '' }
    }

    if (category === 'COMPETITOR_ACTIVITY' || category === 'ACQUISITION' || category === 'IPO') {
      if (textMatchesSector || descMatchesText) {
        return { matched: true, reason: `Competitive move in ${sector} space may impact ${company.name}'s positioning.` }
      }
      return { matched: false, reason: '' }
    }

    if (category === 'MARKET_TREND') {
      if (textMatchesSector) {
        return { matched: true, reason: `Market trend in ${sector} directly relevant to ${company.name}.` }
      }
      if ((/\bai\b/.test(text) || text.includes('enterprise') || text.includes('saas')) &&
          ['SAAS', 'AI', 'DEVTOOLS', 'FINTECH'].includes(sector)) {
        return { matched: true, reason: `Broad ${sector} trend relevant to ${company.name}.` }
      }
      return { matched: false, reason: '' }
    }

    if (textMatchesSector) {
      return { matched: true, reason: `Signal overlaps with ${company.name}'s ${sector} market.` }
    }
    return { matched: false, reason: '' }
  }
}
