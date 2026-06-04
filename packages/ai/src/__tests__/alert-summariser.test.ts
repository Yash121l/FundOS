import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AlertSummariserAgent } from '../alert-summariser-agent'
import type { AlertDigestInput } from '@fundos/types'

vi.mock('../client', () => ({
  getOpenAIClient: vi.fn().mockReturnValue(null),
  MODEL_FAST: 'gpt-4o-mini',
  MODEL_SMART: 'gpt-4o',
}))

const makeRisk = (
  companyName: string,
  category: string,
  severity: 'HIGH' | 'CRITICAL',
  title: string
): AlertDigestInput['risks'][number] => ({
  title,
  severity,
  category,
  companyName,
  createdAt: new Date('2026-06-04'),
})

const MULTI_CATEGORY_INPUT: AlertDigestInput = {
  weekOf: 'Jun 4, 2026',
  risks: [
    makeRisk('AlphaCo', 'BURN', 'CRITICAL', 'Critical Runway — Under 6 Months'),
    makeRisk('BetaCo', 'BURN', 'HIGH', 'Runway Below 12 Months'),
    makeRisk('GammaCo', 'REVENUE', 'HIGH', 'Revenue Declining MoM'),
    makeRisk('DeltaCo', 'REVENUE', 'HIGH', 'Negative Revenue Growth'),
    makeRisk('EpsilonCo', 'TEAM', 'HIGH', 'Key Engineer Departure Risk'),
  ],
}

const SINGLE_CATEGORY_INPUT: AlertDigestInput = {
  weekOf: 'Jun 4, 2026',
  risks: [
    makeRisk('AlphaCo', 'BURN', 'CRITICAL', 'Critical Runway'),
    makeRisk('BetaCo', 'BURN', 'HIGH', 'Low Runway'),
    makeRisk('GammaCo', 'BURN', 'HIGH', 'High Burn Multiple'),
  ],
}

describe('AlertSummariserAgent', () => {
  let agent: AlertSummariserAgent

  beforeEach(() => {
    agent = new AlertSummariserAgent()
  })

  describe('summarise() — empty input', () => {
    it('returns an empty digest for no risks', async () => {
      const digest = await agent.summarise({ weekOf: 'Jun 4, 2026', risks: [] })
      expect(digest.totalAlerts).toBe(0)
      expect(digest.groups).toHaveLength(0)
      expect(digest.overallSummary).toContain('No high-severity')
    })
  })

  describe('summarise() — rule-based fallback', () => {
    it('returns correct total alert count', async () => {
      const digest = await agent.summarise(MULTI_CATEGORY_INPUT)
      expect(digest.totalAlerts).toBe(5)
    })

    it('groups risks by category', async () => {
      const digest = await agent.summarise(MULTI_CATEGORY_INPUT)
      const categories = digest.groups.map((g) => g.category)
      expect(categories).toContain('Burn & Runway')
      expect(categories).toContain('Revenue')
      expect(categories).toContain('Team & Hiring')
    })

    it('orders groups by critical count descending', async () => {
      const digest = await agent.summarise(MULTI_CATEGORY_INPUT)
      // BURN has 1 CRITICAL + 1 HIGH, should appear first
      expect(digest.groups[0]?.category).toBe('Burn & Runway')
    })

    it('includes company names in each group', async () => {
      const digest = await agent.summarise(MULTI_CATEGORY_INPUT)
      const burnGroup = digest.groups.find((g) => g.category === 'Burn & Runway')
      expect(burnGroup?.companies).toContain('AlphaCo')
      expect(burnGroup?.companies).toContain('BetaCo')
    })

    it('includes a coordinated action for each group', async () => {
      const digest = await agent.summarise(MULTI_CATEGORY_INPUT)
      for (const group of digest.groups) {
        expect(group.coordinatedAction.length).toBeGreaterThan(10)
      }
    })

    it('sets severity=critical when critical alerts present', async () => {
      const digest = await agent.summarise(SINGLE_CATEGORY_INPUT)
      const burnGroup = digest.groups.find((g) => g.category === 'Burn & Runway')
      expect(burnGroup?.severity).toBe('critical')
    })

    it('sets severity=high when only high-severity alerts present', async () => {
      const input: AlertDigestInput = {
        weekOf: 'Jun 4, 2026',
        risks: [
          makeRisk('AlphaCo', 'BURN', 'HIGH', 'Risk 1'),
          makeRisk('BetaCo', 'BURN', 'HIGH', 'Risk 2'),
        ],
      }
      const digest = await agent.summarise(input)
      const burnGroup = digest.groups.find((g) => g.category === 'Burn & Runway')
      expect(burnGroup?.severity).toBe('high')
    })

    it('generates overall summary with company count', async () => {
      const digest = await agent.summarise(MULTI_CATEGORY_INPUT)
      // 5 unique companies in multi-category input
      expect(digest.overallSummary).toMatch(/5.+compan/i)
    })

    it('de-duplicates companies within a group', async () => {
      const input: AlertDigestInput = {
        weekOf: 'Jun 4, 2026',
        risks: [
          makeRisk('AlphaCo', 'BURN', 'CRITICAL', 'Risk 1'),
          makeRisk('AlphaCo', 'BURN', 'HIGH', 'Risk 2'), // same company, same category
        ],
      }
      const digest = await agent.summarise(input)
      const burnGroup = digest.groups.find((g) => g.category === 'Burn & Runway')
      expect(burnGroup?.companies.filter((c) => c === 'AlphaCo').length).toBe(1)
    })

    it('sets generatedAt to a Date', async () => {
      const digest = await agent.summarise(MULTI_CATEGORY_INPUT)
      expect(digest.generatedAt).toBeInstanceOf(Date)
    })

    it('sets weekOf correctly', async () => {
      const digest = await agent.summarise(MULTI_CATEGORY_INPUT)
      expect(digest.weekOf).toBe('Jun 4, 2026')
    })
  })

  describe('summarise() — with OpenAI', () => {
    it('falls back to rule-based if OpenAI throws', async () => {
      const { getOpenAIClient } = await import('../client')
      vi.mocked(getOpenAIClient).mockReturnValueOnce({
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('API error')),
          },
        },
      } as never)

      const digest = await agent.summarise(MULTI_CATEGORY_INPUT)
      expect(digest.totalAlerts).toBe(5)
    })
  })
})
