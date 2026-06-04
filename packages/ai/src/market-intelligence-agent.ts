import type { Company, MarketSignal } from '@fundos/types'

export interface MarketIntelligenceInput {
  signal: MarketSignal
  portfolio: Company[]
}

export interface MarketIntelligenceOutput {
  relevantCompanyIds: string[]
  relevanceExplanation: string
}

export class MarketIntelligenceAgent {
  async enrich(input: MarketIntelligenceInput): Promise<MarketIntelligenceOutput> {
    // Full implementation in Phase 9 (Market Intelligence).
    void input
    return { relevantCompanyIds: [], relevanceExplanation: '' }
  }
}
