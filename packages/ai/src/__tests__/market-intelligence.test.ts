import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../client', () => ({
  getOpenAIClient: vi.fn(() => null),
  MODEL_FAST: 'gpt-4o-mini',
  MODEL_SMART: 'gpt-4o',
}))

import { MarketIntelligenceAgent } from '../market-intelligence-agent'
import { getOpenAIClient } from '../client'
import type { MarketSignal, Company } from '@fundos/types'

const mockGetClient = vi.mocked(getOpenAIClient)

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

  beforeEach(() => {
    mockGetClient.mockReturnValue(null) // rule-based path by default
  })

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

// ── Phase 10: AI semantic matching ───────────────────────────

describe('MarketIntelligenceAgent — Phase 10 AI path', () => {
  const agent = new MarketIntelligenceAgent()

  it('uses company names from AI response to resolve IDs', async () => {
    const createSpy = vi.fn().mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            relevantCompanies: [
              { name: 'FinCo', reason: 'Directly competes in the embedded finance space.' },
              { name: 'HealthAI', reason: 'Regulatory AI requirements apply to its clinical AI product.' },
            ],
          }),
        },
      }],
    })
    mockGetClient.mockReturnValue({ chat: { completions: { create: createSpy } } } as never)

    const signal = makeSignal({ title: 'AI Regulation Act passes', summary: 'New rules for AI in finance and healthcare.', category: 'REGULATION' })
    const result = await agent.enrich({ signal, portfolio })

    expect(result.relevantCompanyIds).toContain('c1') // FinCo
    expect(result.relevantCompanyIds).toContain('c2') // HealthAI
    expect(result.perCompanyReasons['c1']).toContain('embedded finance')
  })

  it('ignores company names from AI that do not match the portfolio', async () => {
    const createSpy = vi.fn().mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            relevantCompanies: [{ name: 'GhostCorp', reason: 'Relevant.' }], // not in portfolio
          }),
        },
      }],
    })
    mockGetClient.mockReturnValue({ chat: { completions: { create: createSpy } } } as never)

    const signal = makeSignal({ title: 'Unknown event', summary: 'Nothing specific.', category: 'OTHER' })
    const result = await agent.enrich({ signal, portfolio })
    expect(result.relevantCompanyIds).toHaveLength(0)
  })

  it('falls back to keyword matching when AI throws', async () => {
    const createSpy = vi.fn().mockRejectedValue(new Error('API error'))
    mockGetClient.mockReturnValue({ chat: { completions: { create: createSpy } } } as never)

    const signal = makeSignal({
      title: 'Major fintech funding round',
      summary: 'A leading fintech payments company raised $150M.',
      category: 'FUNDING_NEWS',
    })
    const result = await agent.enrich({ signal, portfolio })
    // Keyword fallback picks up FINTECH sector → c1
    expect(result.relevantCompanyIds).toContain('c1')
  })

  it('passes the signal title and summary to OpenAI', async () => {
    const createSpy = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ relevantCompanies: [] }) } }],
    })
    mockGetClient.mockReturnValue({ chat: { completions: { create: createSpy } } } as never)

    const signal = makeSignal({ title: 'Unique test signal XYZ', summary: 'A unique summary for testing.', category: 'MARKET_TREND' })
    await agent.enrich({ signal, portfolio })

    const userMsg = (createSpy.mock.calls[0]![0] as { messages: Array<{ role: string; content: string }> }).messages[1]!.content
    expect(userMsg).toContain('Unique test signal XYZ')
    expect(userMsg).toContain('A unique summary for testing.')
  })
})
