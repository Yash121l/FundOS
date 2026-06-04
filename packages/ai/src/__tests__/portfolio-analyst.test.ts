import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PortfolioAnalystInput, Company, MetricSnapshot, FounderUpdate } from '@fundos/types'

// vi.mock is hoisted before imports — the mock is in place when portfolio-analyst loads
vi.mock('../client', () => ({
  getOpenAIClient: vi.fn(() => null), // default: no key → rule-based fallback
  MODEL_FAST: 'gpt-4o-mini',
  MODEL_SMART: 'gpt-4o',
}))

import { PortfolioAnalyst } from '../portfolio-analyst'
import { getOpenAIClient } from '../client'

const mockGetClient = vi.mocked(getOpenAIClient)

// ── Fixtures ─────────────────────────────────────────────────

function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'c1',
    name: 'AlphaOps',
    slug: 'alphaops',
    logoUrl: null,
    website: null,
    sector: 'SAAS',
    stage: 'SERIES_A',
    country: 'US',
    foundedYear: 2021,
    description: 'B2B workflow automation',
    status: 'ACTIVE',
    healthStatus: 'HEALTHY',
    healthScore: 75,
    latestMetricsId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeMetric(overrides: Partial<MetricSnapshot> = {}): MetricSnapshot {
  return {
    id: 'snap-1',
    companyId: 'c1',
    period: '2026-06',
    mrr: 120_000,
    arr: 1_440_000,
    revenueGrowthMom: 0.08,
    revenueGrowthYoy: null,
    grossMargin: 0.72,
    nrr: 108,
    burnRate: 90_000,
    cashBalance: 1_800_000,
    runway: 20,
    headcount: 25,
    headcountChange: 2,
    healthScore: null,
    source: 'FOUNDER_UPDATE',
    createdAt: new Date(),
    ...overrides,
  }
}

function makeUpdate(overrides: Partial<FounderUpdate> = {}): FounderUpdate {
  return {
    id: 'u1',
    companyId: 'c1',
    period: '2026-06',
    submittedById: null,
    mrr: 120_000,
    burnRate: 90_000,
    cashBalance: 1_800_000,
    runway: 20,
    headcount: 25,
    fundraisingStatus: 'NOT_RAISING',
    fundraisingNote: null,
    wins: 'Signed 3 new enterprise customers. Launched new API.',
    risks: 'Sales cycle is lengthening for mid-market deals.',
    hiringNeeds: null,
    additionalNotes: null,
    aiSummary: null,
    founderTone: null,
    aiProcessedAt: null,
    reviewedAt: null,
    reviewedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeInput(overrides: {
  metricsHistory?: MetricSnapshot[]
  updateOverrides?: Partial<FounderUpdate>
} = {}): PortfolioAnalystInput {
  return {
    company: makeCompany(),
    latestUpdate: makeUpdate(overrides.updateOverrides),
    metricsHistory: overrides.metricsHistory ?? [makeMetric()],
    previousUpdates: [],
  }
}

// ── Rule-based path (no OPENAI_API_KEY) ───────────────────────

describe('PortfolioAnalyst — rule-based fallback (no API key)', () => {
  const agent = new PortfolioAnalyst()

  beforeEach(() => {
    mockGetClient.mockReturnValue(null) // no key
  })

  it('returns the expected output shape', async () => {
    const result = await agent.analyze(makeInput())
    expect(result).toHaveProperty('healthSummary')
    expect(result).toHaveProperty('risks')
    expect(result).toHaveProperty('opportunities')
    expect(result).toHaveProperty('suggestedActions')
    expect(Array.isArray(result.risks)).toBe(true)
    expect(Array.isArray(result.opportunities)).toBe(true)
    expect(Array.isArray(result.suggestedActions)).toBe(true)
  })

  it('founderTone is undefined without an OpenAI key', async () => {
    const result = await agent.analyze(makeInput())
    expect(result.founderTone).toBeUndefined()
  })

  it('detects CRITICAL burn risk when runway < 6 months', async () => {
    const result = await agent.analyze(makeInput({ metricsHistory: [makeMetric({ runway: 4, burnRate: 80_000 })] }))
    const critical = result.risks.find((r) => r.severity === 'CRITICAL' && r.category === 'BURN')
    expect(critical).toBeDefined()
    expect(critical!.title).toMatch(/runway/i)
  })

  it('detects HIGH burn risk when runway is 6–11 months', async () => {
    const result = await agent.analyze(makeInput({ metricsHistory: [makeMetric({ runway: 9 })] }))
    const high = result.risks.find((r) => r.severity === 'HIGH' && r.category === 'BURN')
    expect(high).toBeDefined()
  })

  it('does not flag burn risk when runway >= 12 months', async () => {
    const result = await agent.analyze(makeInput({ metricsHistory: [makeMetric({ runway: 18 })] }))
    const burnRisks = result.risks.filter((r) => r.category === 'BURN')
    expect(burnRisks).toHaveLength(0)
  })

  it('detects HIGH revenue risk when MoM decline exceeds 5%', async () => {
    const result = await agent.analyze(makeInput({ metricsHistory: [makeMetric({ revenueGrowthMom: -0.08 })] }))
    const rev = result.risks.find((r) => r.category === 'REVENUE' && r.severity === 'HIGH')
    expect(rev).toBeDefined()
    expect(rev!.description).toContain('-8.0%')
  })

  it('detects MEDIUM revenue risk when MoM decline is < 5%', async () => {
    const result = await agent.analyze(makeInput({ metricsHistory: [makeMetric({ revenueGrowthMom: -0.03 })] }))
    const rev = result.risks.find((r) => r.category === 'REVENUE' && r.severity === 'MEDIUM')
    expect(rev).toBeDefined()
  })

  it('does not flag revenue risk when growth is positive', async () => {
    const result = await agent.analyze(makeInput({ metricsHistory: [makeMetric({ revenueGrowthMom: 0.1 })] }))
    const revenueRisks = result.risks.filter((r) => r.category === 'REVENUE')
    expect(revenueRisks).toHaveLength(0)
  })

  it('detects burn multiple risk when burn > 3x MRR', async () => {
    const result = await agent.analyze(makeInput({
      metricsHistory: [makeMetric({ mrr: 30_000, burnRate: 120_000, runway: 18 })],
    }))
    const burnMultiple = result.risks.find((r) => r.title.toLowerCase().includes('burn multiple'))
    expect(burnMultiple).toBeDefined()
  })

  it('surfaces founder-flagged risk when risks narrative is substantial', async () => {
    const result = await agent.analyze(makeInput({
      updateOverrides: { risks: 'We are seeing significant customer churn in our mid-market segment due to a new competitor offering similar features at half the price. This is a major concern for Q3.' },
    }))
    const founderRisk = result.risks.find((r) => r.source === 'founder_update')
    expect(founderRisk).toBeDefined()
    expect(founderRisk!.title).toMatch(/founder/i)
  })

  it('does not add a founder-flagged risk for very short narratives', async () => {
    const result = await agent.analyze(makeInput({ updateOverrides: { risks: 'Hiring.' } }))
    const founderRisks = result.risks.filter((r) => r.source === 'founder_update')
    expect(founderRisks).toHaveLength(0)
  })

  it('only suggests actions for CRITICAL and HIGH risks', async () => {
    const result = await agent.analyze(makeInput({
      metricsHistory: [makeMetric({ runway: 4, revenueGrowthMom: -0.1 })],
    }))
    for (const action of result.suggestedActions) {
      const sourceRisk = result.risks.find((r) =>
        r.severity === 'CRITICAL' || r.severity === 'HIGH'
      )
      expect(sourceRisk).toBeDefined()
    }
  })

  it('returns a non-empty healthSummary mentioning the company name', async () => {
    const result = await agent.analyze(makeInput())
    expect(result.healthSummary.length).toBeGreaterThan(20)
    expect(result.healthSummary).toContain('AlphaOps')
  })

  it('handles null metrics gracefully without throwing', async () => {
    const result = await agent.analyze(makeInput({ metricsHistory: [] }))
    expect(result.healthSummary).toBeTruthy()
    expect(result.risks).toBeDefined()
  })

  it('detects strong growth opportunity when MoM >= 15%', async () => {
    const result = await agent.analyze(makeInput({ metricsHistory: [makeMetric({ revenueGrowthMom: 0.18 })] }))
    const opp = result.opportunities.find((o) => o.category === 'FUNDRAISING')
    expect(opp).toBeDefined()
  })
})

// ── AI path (mocked OpenAI client) ────────────────────────────

function makeMockClient(responseContent: object) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(responseContent) } }],
          usage: { prompt_tokens: 250, completion_tokens: 180 },
        }),
      },
    },
  } as unknown as ReturnType<typeof getOpenAIClient> & {}
}

describe('PortfolioAnalyst — AI path (mocked OpenAI)', () => {
  const agent = new PortfolioAnalyst()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns founderTone from OpenAI response', async () => {
    mockGetClient.mockReturnValue(makeMockClient({
      founderTone: 'confident',
      healthSummary: 'AlphaOps is performing strongly with healthy metrics.',
      risks: [],
      opportunities: [],
      suggestedActions: [],
    }))

    const result = await agent.analyze(makeInput())
    expect(result.founderTone).toBe('confident')
  })

  it('returns AI-generated healthSummary over rule-based template', async () => {
    const aiSummary = 'AlphaOps delivered a strong quarter — MRR up, burn disciplined.'
    mockGetClient.mockReturnValue(makeMockClient({
      founderTone: 'confident',
      healthSummary: aiSummary,
      risks: [],
      opportunities: [],
      suggestedActions: [],
    }))

    const result = await agent.analyze(makeInput())
    expect(result.healthSummary).toBe(aiSummary)
  })

  it('returns AI-detected risks alongside metrics-based ones', async () => {
    mockGetClient.mockReturnValue(makeMockClient({
      founderTone: 'cautious',
      healthSummary: 'Performance is acceptable but risks are building.',
      risks: [
        { title: 'Key account at risk', description: 'Top customer hinted at churn.', severity: 'HIGH', category: 'REVENUE', source: 'ai', status: 'OPEN' },
      ],
      opportunities: [],
      suggestedActions: [],
    }))

    const result = await agent.analyze(makeInput())
    expect(result.risks).toHaveLength(1)
    expect(result.risks[0]!.title).toBe('Key account at risk')
  })

  it('clamps invalid founderTone to "uncertain"', async () => {
    mockGetClient.mockReturnValue(makeMockClient({
      founderTone: 'excited', // not a valid value
      healthSummary: 'Summary.',
      risks: [],
      opportunities: [],
      suggestedActions: [],
    }))

    const result = await agent.analyze(makeInput())
    expect(result.founderTone).toBe('uncertain')
  })

  it('all four valid tones are accepted without being remapped', async () => {
    const tones = ['confident', 'cautious', 'distressed', 'uncertain'] as const
    for (const tone of tones) {
      mockGetClient.mockReturnValue(makeMockClient({
        founderTone: tone,
        healthSummary: 'Summary.',
        risks: [],
        opportunities: [],
        suggestedActions: [],
      }))
      const result = await agent.analyze(makeInput())
      expect(result.founderTone).toBe(tone)
    }
  })

  it('falls back to rule-based output when OpenAI throws', async () => {
    mockGetClient.mockReturnValue({
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('Rate limit exceeded')),
        },
      },
    } as unknown as ReturnType<typeof getOpenAIClient> & {})

    const result = await agent.analyze(makeInput({
      metricsHistory: [makeMetric({ runway: 4 })],
    }))
    // Rule-based fallback fires — detects critical runway
    expect(result.founderTone).toBeUndefined()
    const critical = result.risks.find((r) => r.severity === 'CRITICAL' && r.category === 'BURN')
    expect(critical).toBeDefined()
  })

  it('falls back gracefully when OpenAI returns malformed JSON', async () => {
    mockGetClient.mockReturnValue({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'not json at all' } }],
          }),
        },
      },
    } as unknown as ReturnType<typeof getOpenAIClient> & {})

    // Should not throw — JSON.parse throws, caught, falls back
    await expect(agent.analyze(makeInput())).resolves.toBeDefined()
  })

  it('calls OpenAI with response_format json_object', async () => {
    const createSpy = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ founderTone: 'confident', healthSummary: 'Ok.', risks: [], opportunities: [], suggestedActions: [] }) } }],
      usage: { prompt_tokens: 200, completion_tokens: 100 },
    })
    mockGetClient.mockReturnValue({ chat: { completions: { create: createSpy } } } as never)

    await agent.analyze(makeInput())
    const callArgs = createSpy.mock.calls[0]![0] as Record<string, unknown>
    expect(callArgs.response_format).toEqual({ type: 'json_object' })
  })

  it('passes both system and user messages to OpenAI', async () => {
    const createSpy = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ founderTone: 'confident', healthSummary: 'Ok.', risks: [], opportunities: [], suggestedActions: [] }) } }],
      usage: { prompt_tokens: 200, completion_tokens: 100 },
    })
    mockGetClient.mockReturnValue({ chat: { completions: { create: createSpy } } } as never)

    await agent.analyze(makeInput())
    const messages = (createSpy.mock.calls[0]![0] as { messages: Array<{ role: string; content: string }> }).messages
    expect(messages[0]!.role).toBe('system')
    expect(messages[1]!.role).toBe('user')
  })

  it('user message includes company name and sector', async () => {
    const createSpy = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ founderTone: 'confident', healthSummary: 'Ok.', risks: [], opportunities: [], suggestedActions: [] }) } }],
      usage: { prompt_tokens: 200, completion_tokens: 100 },
    })
    mockGetClient.mockReturnValue({ chat: { completions: { create: createSpy } } } as never)

    await agent.analyze(makeInput())
    const userMsg = (createSpy.mock.calls[0]![0] as { messages: Array<{ role: string; content: string }> }).messages[1]!.content
    expect(userMsg).toContain('AlphaOps')
    expect(userMsg).toContain('SAAS')
  })
})
