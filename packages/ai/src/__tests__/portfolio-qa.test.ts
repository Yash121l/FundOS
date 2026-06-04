import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PortfolioQAAgent } from '../portfolio-qa-agent'
import type { AskContext } from '@fundos/types'

async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const chunks: string[] = []
  let done = false
  while (!done) {
    const result = await reader.read()
    done = result.done
    if (!result.done && result.value) chunks.push(decoder.decode(result.value))
  }
  return chunks.join('')
}

vi.mock('../client', () => ({
  getOpenAIClient: vi.fn().mockReturnValue(null),
  MODEL_FAST: 'gpt-4o-mini',
  MODEL_SMART: 'gpt-4o',
}))

const MOCK_CONTEXT: AskContext = {
  asOf: 'June 2026',
  fundMetrics: {
    totalMrr: 1_500_000,
    totalArr: 18_000_000,
    totalBurn: 800_000,
    avgGrowth: 0.08,
    avgRunway: 16,
    totalHeadcount: 420,
  },
  companies: [
    {
      id: 'co-1',
      name: 'AlphaCloud',
      slug: 'alphacloud',
      sector: 'SAAS',
      stage: 'SERIES_A',
      healthStatus: 'HEALTHY',
      healthScore: 78,
      description: 'B2B SaaS for DevOps',
      latestMetrics: {
        mrr: 150_000,
        revenueGrowthMom: 0.12,
        burnRate: 80_000,
        runway: 22,
        headcount: 35,
      },
    },
    {
      id: 'co-2',
      name: 'BurnCorp',
      slug: 'burncorp',
      sector: 'FINTECH',
      stage: 'SEED',
      healthStatus: 'AT_RISK',
      healthScore: 28,
      description: null,
      latestMetrics: {
        mrr: 30_000,
        revenueGrowthMom: -0.05,
        burnRate: 120_000,
        runway: 5,
        headcount: 12,
      },
    },
    {
      id: 'co-3',
      name: 'SteadyCo',
      slug: 'steadyco',
      sector: 'AI',
      stage: 'SERIES_A',
      healthStatus: 'WATCHLIST',
      healthScore: 55,
      description: 'AI workflow automation',
      latestMetrics: {
        mrr: 80_000,
        revenueGrowthMom: 0.03,
        burnRate: 95_000,
        runway: 10,
        headcount: 22,
      },
    },
  ],
  recentUpdates: [
    {
      companyName: 'BurnCorp',
      period: '2026-05',
      wins: 'Signed 2 new pilots',
      risks: 'Runway is critical, need to close bridge round',
      mrr: 30_000,
      runway: 5,
      fundraisingStatus: 'ACTIVELY_RAISING',
    },
  ],
  activeTrends: [
    {
      title: 'Fundraising Wave',
      summary: '3 companies actively raising',
      category: 'FUNDRAISING',
      severity: 'MEDIUM',
      affectedCount: 3,
    },
  ],
  activeRisks: [
    {
      title: 'Critical Runway — Under 6 Months',
      severity: 'CRITICAL',
      category: 'BURN',
      companyName: 'BurnCorp',
    },
  ],
}

describe('PortfolioQAAgent', () => {
  let agent: PortfolioQAAgent

  beforeEach(() => {
    agent = new PortfolioQAAgent()
  })

  describe('stream() — rule-based fallback (no OpenAI)', () => {
    it('returns a ReadableStream', async () => {
      const stream = await agent.stream('Which companies are at risk?', MOCK_CONTEXT)
      expect(stream).toBeInstanceOf(ReadableStream)
    })

    it('streams full text before closing', async () => {
      const stream = await agent.stream('test question', MOCK_CONTEXT)
      const result = await readStream(stream)
      expect(result.length).toBeGreaterThan(10)
    })

    it('answers runway queries with company list', async () => {
      const stream = await agent.stream('Which companies have runway under 9 months?', MOCK_CONTEXT)
      const result = await readStream(stream)
      expect(result).toContain('BurnCorp')
    })

    it('answers at-risk queries', async () => {
      const stream = await agent.stream('Show me companies at risk', MOCK_CONTEXT)
      const result = await readStream(stream)
      expect(result).toContain('BurnCorp')
      expect(result).not.toContain('AlphaCloud') // AlphaCloud is HEALTHY
    })

    it('answers watchlist queries', async () => {
      const stream = await agent.stream('What companies are on the watchlist?', MOCK_CONTEXT)
      const result = await readStream(stream)
      expect(result).toContain('SteadyCo')
    })

    it('answers portfolio overview queries', async () => {
      const stream = await agent.stream('Give me a portfolio overview', MOCK_CONTEXT)
      const result = await readStream(stream)
      expect(result).toMatch(/\$1\.5M|\$1,500K/i)
    })

    it('answers trend queries', async () => {
      const stream = await agent.stream('What trends are active?', MOCK_CONTEXT)
      const result = await readStream(stream)
      expect(result).toContain('Fundraising Wave')
    })

    it('returns no-companies message when threshold finds nothing', async () => {
      const stream = await agent.stream('Which companies have runway under 1 months?', MOCK_CONTEXT)
      const result = await readStream(stream)
      expect(result.toLowerCase()).toContain('no companies')
    })

    it('mentions API key requirement for generic questions', async () => {
      const stream = await agent.stream('What did the founders say about hiring?', MOCK_CONTEXT)
      const result = await readStream(stream)
      expect(result.toLowerCase()).toMatch(/openai|api key/i)
    })
  })

  describe('stream() — with OpenAI', () => {
    it('falls back to rule-based if OpenAI throws', async () => {
      const { getOpenAIClient } = await import('../client')
      vi.mocked(getOpenAIClient).mockReturnValueOnce({
        chat: {
          completions: {
            create: vi.fn().mockRejectedValueOnce(new Error('API error')),
          },
        },
      } as never)

      const stream = await agent.stream('test', MOCK_CONTEXT)
      const result = await readStream(stream)
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
