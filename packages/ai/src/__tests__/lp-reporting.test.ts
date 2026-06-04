import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../client', () => ({
  getOpenAIClient: vi.fn(() => null),
  MODEL_FAST: 'gpt-4o-mini',
  MODEL_SMART: 'gpt-4o',
}))

import { LPReportingAgent } from '../lp-reporting-agent'
import { getOpenAIClient } from '../client'
import type { LPReportInput, CompanyWithMetrics, FundAggregates } from '@fundos/types'

const mockGetClient = vi.mocked(getOpenAIClient)

function makeCompany(overrides: { id: string; name: string; healthStatus?: string; mrr?: number; growth?: number }): CompanyWithMetrics {
  return {
    id: overrides.id,
    name: overrides.name,
    slug: overrides.name.toLowerCase().replace(/\s/g, '-'),
    logoUrl: null,
    website: null,
    sector: 'SAAS',
    stage: 'SERIES_A',
    country: 'US',
    foundedYear: 2020,
    description: null,
    status: 'ACTIVE',
    healthStatus: (overrides.healthStatus ?? 'HEALTHY') as never,
    healthScore: overrides.healthStatus === 'AT_RISK' ? 30 : overrides.healthStatus === 'WATCHLIST' ? 52 : 78,
    latestMetricsId: 'snap-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    latestMetrics: {
      id: 'snap-1',
      companyId: overrides.id,
      period: '2026-06',
      mrr: overrides.mrr ?? 100_000,
      arr: (overrides.mrr ?? 100_000) * 12,
      revenueGrowthMom: overrides.growth ?? 0.08,
      revenueGrowthYoy: null,
      grossMargin: 0.72,
      nrr: 112,
      burnRate: 80_000,
      cashBalance: 2_000_000,
      runway: 25,
      headcount: 20,
      headcountChange: 2,
      healthScore: null,
      source: 'MANUAL',
      createdAt: new Date(),
    },
    metricsHistory: [],
  }
}

const fundMetrics: FundAggregates = {
  totalMrr: 500_000,
  totalArr: 6_000_000,
  totalBurn: 350_000,
  avgGrowthMom: 0.09,
  avgRunway: 18,
  totalHeadcount: 120,
  healthDistribution: { healthy: 4, watchlist: 2, atRisk: 1 },
}

const baseInput: LPReportInput = {
  quarter: '2026-Q2',
  companies: [
    makeCompany({ id: 'c1', name: 'AlphaOps', mrr: 180_000, growth: 0.15 }),
    makeCompany({ id: 'c2', name: 'BetaFlow', mrr: 120_000, growth: 0.08 }),
    makeCompany({ id: 'c3', name: 'GammaTech', mrr: 80_000, growth: -0.03, healthStatus: 'WATCHLIST' }),
    makeCompany({ id: 'c4', name: 'DeltaAI', mrr: 70_000, growth: -0.08, healthStatus: 'AT_RISK' }),
    makeCompany({ id: 'c5', name: 'EpsilonData', mrr: 50_000, growth: 0.05 }),
  ],
  recentUpdates: [],
  fundMetrics,
  tone: 'STANDARD',
}

describe('LPReportingAgent', () => {
  const agent = new LPReportingAgent()

  beforeEach(() => {
    mockGetClient.mockReturnValue(null) // rule-based by default
  })

  it('generates exactly 5 sections in the correct order', async () => {
    const result = await agent.generate(baseInput)
    expect(result.sections).toHaveLength(5)
    expect(result.sections[0]!.order).toBe(1)
    expect(result.sections[4]!.order).toBe(5)
  })

  it('section titles match the expected structure', async () => {
    const result = await agent.generate(baseInput)
    const titles = result.sections.map((s) => s.title)
    expect(titles[0]).toContain('Executive Summary')
    expect(titles[1]).toContain('Portfolio Highlights')
    expect(titles[2]).toContain('Portfolio Risks')
    expect(titles[3]).toContain('Fund Metrics')
    expect(titles[4]).toContain('Appendix')
  })

  it('executive summary mentions the quarter', async () => {
    const result = await agent.generate(baseInput)
    expect(result.sections[0]!.content).toContain('2026-Q2')
  })

  it('executive summary mentions fund-level MRR', async () => {
    const result = await agent.generate(baseInput)
    expect(result.sections[0]!.content).toMatch(/\$500K|\$500,000|500K MRR/)
  })

  it('portfolio highlights features top-performing companies', async () => {
    const result = await agent.generate(baseInput)
    // AlphaOps has highest MRR (180K) and growth (15%)
    expect(result.sections[1]!.content).toContain('AlphaOps')
  })

  it('portfolio risks mentions at-risk companies', async () => {
    const result = await agent.generate(baseInput)
    expect(result.sections[2]!.content).toContain('DeltaAI')
  })

  it('appendix contains all company names', async () => {
    const result = await agent.generate(baseInput)
    const appendix = result.sections[4]!.content
    expect(appendix).toContain('AlphaOps')
    expect(appendix).toContain('BetaFlow')
    expect(appendix).toContain('GammaTech')
    expect(appendix).toContain('DeltaAI')
    expect(appendix).toContain('EpsilonData')
  })

  it('all sections have non-empty content', async () => {
    const result = await agent.generate(baseInput)
    for (const section of result.sections) {
      expect(section.content.trim().length).toBeGreaterThan(50)
    }
  })

  it('growth-focused tone emphasises positive metrics', async () => {
    const growthInput = { ...baseInput, tone: 'GROWTH_FOCUSED' as const }
    const result = await agent.generate(growthInput)
    // Executive summary should lead with a positive framing
    expect(result.sections[0]!.content.toLowerCase()).toMatch(/growth|momentum|strong|performing/)
  })

  it('conservative tone is more measured', async () => {
    const conservativeInput = { ...baseInput, tone: 'CONSERVATIVE' as const }
    const result = await agent.generate(conservativeInput)
    expect(result.sections).toHaveLength(5)
  })
})

// ── Phase 10: AI prose generation ────────────────────────────

describe('LPReportingAgent — Phase 10 AI path', () => {
  const agent = new LPReportingAgent()

  it('uses AI content when OpenAI returns non-empty strings', async () => {
    const sectionContents = [
      'Executive summary written by GPT-4o.',
      'Portfolio highlights — AlphaOps led the quarter.',
      'Portfolio risks — DeltaAI remains at risk.',
      'Fund metrics — burn multiple improved.',
      '| Company | Sector |\n|---------|--------|\n| AlphaOps | SaaS |',
    ]
    let callCount = 0
    const createSpy = vi.fn().mockImplementation(() => {
      const content = sectionContents[callCount++] ?? ''
      return Promise.resolve({ choices: [{ message: { content } }] })
    })
    mockGetClient.mockReturnValue({ chat: { completions: { create: createSpy } } } as never)

    const result = await agent.generate(baseInput)
    expect(result.sections).toHaveLength(5)
    expect(result.sections[0]!.content).toContain('GPT-4o')
    expect(result.sections[1]!.content).toContain('AlphaOps')
  })

  it('falls back to rule-based section when AI returns empty content', async () => {
    const createSpy = vi.fn().mockResolvedValue({ choices: [{ message: { content: '' } }] })
    mockGetClient.mockReturnValue({ chat: { completions: { create: createSpy } } } as never)

    const result = await agent.generate(baseInput)
    // Rule-based fallback kicks in for empty sections
    expect(result.sections[0]!.content.length).toBeGreaterThan(50)
    expect(result.sections[0]!.content).toContain('2026-Q2')
  })

  it('falls back entirely to rule-based when OpenAI throws', async () => {
    const createSpy = vi.fn().mockRejectedValue(new Error('API unavailable'))
    mockGetClient.mockReturnValue({ chat: { completions: { create: createSpy } } } as never)

    const result = await agent.generate(baseInput)
    expect(result.sections).toHaveLength(5)
    // Rule-based output contains expected structure
    expect(result.sections[0]!.content).toContain('2026-Q2')
    expect(result.sections[4]!.content).toContain('AlphaOps')
  })

  it('makes exactly 5 parallel OpenAI calls — one per section', async () => {
    const createSpy = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'Section content here with more than 20 chars.' } }],
    })
    mockGetClient.mockReturnValue({ chat: { completions: { create: createSpy } } } as never)

    await agent.generate(baseInput)
    expect(createSpy).toHaveBeenCalledTimes(5)
  })

  it('passes system prompt as first message to every section call', async () => {
    const createSpy = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'Section content here with more than 20 chars.' } }],
    })
    mockGetClient.mockReturnValue({ chat: { completions: { create: createSpy } } } as never)

    await agent.generate(baseInput)
    for (const call of createSpy.mock.calls) {
      const messages = (call[0] as { messages: Array<{ role: string }> }).messages
      expect(messages[0]!.role).toBe('system')
      expect(messages[1]!.role).toBe('user')
    }
  })
})
