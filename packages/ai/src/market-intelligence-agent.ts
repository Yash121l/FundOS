import type { Company, MarketSignal } from '@fundos/types'

export interface MarketIntelligenceInput {
  signal: MarketSignal
  portfolio: Company[]
}

export interface MarketIntelligenceOutput {
  relevantCompanyIds: string[]
  relevanceExplanation: string
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
    const { signal, portfolio } = input
    const text = `${signal.title} ${signal.summary}`.toLowerCase()

    const relevantIds: string[] = []
    const reasons: string[] = []

    for (const company of portfolio) {
      if (company.status !== 'ACTIVE') continue
      const result = this.isRelevant(signal.category, text, company)
      if (result.matched) {
        relevantIds.push(company.id)
        reasons.push(result.reason)
      }
    }

    const explanation = relevantIds.length > 0
      ? `Signal relevant to ${relevantIds.length} portfolio compan${relevantIds.length === 1 ? 'y' : 'ies'}. ${reasons[0] ?? ''}`
      : `No direct portfolio relevance detected for this signal.`

    return { relevantCompanyIds: relevantIds, relevanceExplanation: explanation }
  }

  private isRelevant(
    category: string,
    text: string,
    company: Company
  ): { matched: boolean; reason: string } {
    const { sector } = company
    const keywords = SECTOR_KEYWORDS[sector] ?? []
    const desc = (company.description ?? '').toLowerCase()
    const textMatchesSector = keywords.some((kw) => text.includes(kw))
    const descMatchesText = keywords.some((kw) => desc.includes(kw) && text.includes(kw.split(' ')[0]!))

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
      if ((text.includes('ai') || text.includes('enterprise') || text.includes('saas')) &&
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
