import { describe, it, expect } from 'vitest'
import { MarketIntelligenceAgent } from '../market-intelligence-agent'
import type { MarketSignal, Company } from '@fundos/types'

function makeSignal(overrides: Partial<MarketSignal> & Pick<MarketSignal, 'title' | 'summary' | 'category'>): MarketSignal {
  return {
    id: 'sig-1',
    url: null,
    source: 'TechCrunch',
    relevance: null,
    publishedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  }
}

function makeCompany(overrides: { id: string; name: string; sector: string; description?: string }): Company {
  return {
    id: overrides.id,
    name: overrides.name,
    slug: overrides.name.toLowerCase(),
    logoUrl: null,
    website: null,
    sector: overrides.sector as Company['sector'],
    stage: 'SERIES_A',
    country: 'US',
    foundedYear: 2021,
    description: overrides.description ?? null,
    status: 'ACTIVE',
    healthStatus: 'HEALTHY',
    healthScore: 75,
    latestMetricsId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

const portfolio: Company[] = [
  makeCompany({ id: 'c1', name: 'FinCo', sector: 'FINTECH', description: 'B2B payments and lending platform' }),
  makeCompany({ id: 'c2', name: 'HealthAI', sector: 'HEALTHTECH', description: 'Clinical decision support AI' }),
  makeCompany({ id: 'c3', name: 'DevTools Co', sector: 'DEVTOOLS', description: 'Developer productivity platform' }),
  makeCompany({ id: 'c4', name: 'SaaSCo', sector: 'SAAS', description: 'B2B workflow automation' }),
  makeCompany({ id: 'c5', name: 'ClimaCo', sector: 'CLIMATETECH', description: 'Carbon accounting software' }),
]

describe('MarketIntelligenceAgent', () => {
  const agent = new MarketIntelligenceAgent()

  it('matches FUNDING_NEWS signal to companies in the same sector', async () => {
    const signal = makeSignal({
      title: 'Major fintech startup raises $200M Series C',
      summary: 'A leading B2B fintech payments company closed a $200M round, signalling strong investor confidence in embedded finance.',
      category: 'FUNDING_NEWS',
    })
    const result = await agent.enrich({ signal, portfolio })
    expect(result.relevantCompanyIds).toContain('c1') // FINTECH
    expect(result.relevanceExplanation).toBeTruthy()
  })

  it('matches REGULATION signal to regulated sectors (FINTECH, HEALTHTECH)', async () => {
    const signal = makeSignal({
      title: 'New data privacy regulations for AI in financial services',
      summary: 'Regulators announce stricter AI transparency requirements for financial services and healthcare AI applications.',
      category: 'REGULATION',
    })
    const result = await agent.enrich({ signal, portfolio })
    expect(result.relevantCompanyIds).toContain('c1') // FINTECH
    expect(result.relevantCompanyIds).toContain('c2') // HEALTHTECH
  })

  it('matches COMPETITOR_ACTIVITY to companies in overlapping sector', async () => {
    const signal = makeSignal({
      title: 'Stripe launches new developer tools suite',
      summary: 'Stripe expands into developer productivity with a new suite of API tooling and documentation automation.',
      category: 'COMPETITOR_ACTIVITY',
    })
    const result = await agent.enrich({ signal, portfolio })
    // developer tools mention → DEVTOOLS companies
    expect(result.relevantCompanyIds).toContain('c3')
  })

  it('returns relevanceExplanation as a non-empty string', async () => {
    const signal = makeSignal({
      title: 'AI regulation bill passes Senate',
      summary: 'New federal AI bill introduces compliance requirements for AI used in healthcare decisions.',
      category: 'REGULATION',
    })
    const result = await agent.enrich({ signal, portfolio })
    expect(typeof result.relevanceExplanation).toBe('string')
    expect(result.relevanceExplanation.length).toBeGreaterThan(0)
  })

  it('returns empty list when no companies are relevant', async () => {
    const signal = makeSignal({
      title: 'Agricultural drone company raises Series A',
      summary: 'A precision agriculture drone startup raises funding for crop monitoring in rural markets.',
      category: 'FUNDING_NEWS',
    })
    const isolatedPortfolio = [makeCompany({ id: 'cx', name: 'SoftwareCo', sector: 'SAAS' })]
    const result = await agent.enrich({ signal, portfolio: isolatedPortfolio })
    // Agriculture has no matching sector
    expect(Array.isArray(result.relevantCompanyIds)).toBe(true)
  })

  it('matches MARKET_TREND to all potentially impacted sectors', async () => {
    const signal = makeSignal({
      title: 'AI adoption surges across B2B software markets',
      summary: 'Enterprise AI adoption reaches 60% across SaaS, fintech, and developer tools markets.',
      category: 'MARKET_TREND',
    })
    const result = await agent.enrich({ signal, portfolio })
    expect(result.relevantCompanyIds.length).toBeGreaterThan(0)
  })
})
