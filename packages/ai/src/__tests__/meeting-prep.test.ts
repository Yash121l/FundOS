import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MeetingPrepAgent } from '../meeting-prep-agent'
import type { MeetingBriefInput } from '@fundos/types'

vi.mock('../client', () => ({
  getOpenAIClient: vi.fn().mockReturnValue(null),
  MODEL_FAST: 'gpt-4o-mini',
  MODEL_SMART: 'gpt-4o',
}))

const HEALTHY_INPUT: MeetingBriefInput = {
  company: {
    id: 'co-1',
    name: 'GrowthCo',
    sector: 'SAAS',
    stage: 'SERIES_A',
    healthStatus: 'HEALTHY',
    healthScore: 82,
    description: 'B2B analytics platform',
  },
  metricsHistory: [
    { period: '2026-05', mrr: 200_000, revenueGrowthMom: 0.10, burnRate: 90_000, runway: 24, headcount: 40, healthScore: 82 },
    { period: '2026-04', mrr: 180_000, revenueGrowthMom: 0.08, burnRate: 85_000, runway: 25, headcount: 38, healthScore: 80 },
    { period: '2026-03', mrr: 165_000, revenueGrowthMom: 0.07, burnRate: 82_000, runway: 26, headcount: 36, healthScore: 79 },
  ],
  recentUpdates: [
    {
      period: '2026-05',
      wins: 'Closed 3 enterprise contracts worth $40K ARR',
      risks: 'Sales cycle lengthening for mid-market',
      mrr: 200_000,
      runway: 24,
      fundraisingStatus: 'NOT_RAISING',
      aiSummary: null,
      founderTone: 'confident',
    },
  ],
  openRisks: [
    { title: 'Sales cycle lengthening', severity: 'MEDIUM', category: 'REVENUE', status: 'OPEN' },
  ],
  pendingActions: [
    { title: 'Introduce to Sequoia portfolio for referrals', priority: 'HIGH', status: 'PENDING' },
  ],
}

const AT_RISK_INPUT: MeetingBriefInput = {
  company: {
    id: 'co-2',
    name: 'BurnCo',
    sector: 'FINTECH',
    stage: 'SEED',
    healthStatus: 'AT_RISK',
    healthScore: 25,
    description: null,
  },
  metricsHistory: [
    { period: '2026-05', mrr: 20_000, revenueGrowthMom: -0.08, burnRate: 120_000, runway: 4, headcount: 8, healthScore: 25 },
    { period: '2026-04', mrr: 22_000, revenueGrowthMom: 0.01, burnRate: 115_000, runway: 6, headcount: 10, healthScore: 32 },
    { period: '2026-03', mrr: 21_800, revenueGrowthMom: 0.02, burnRate: 110_000, runway: 8, headcount: 11, healthScore: 38 },
  ],
  recentUpdates: [
    {
      period: '2026-05',
      wins: 'Closed 1 small pilot',
      risks: 'Runway is critical, need bridge immediately',
      mrr: 20_000,
      runway: 4,
      fundraisingStatus: 'ACTIVELY_RAISING',
      aiSummary: null,
      founderTone: 'distressed',
    },
  ],
  openRisks: [
    { title: 'Critical Runway — Under 6 Months', severity: 'CRITICAL', category: 'BURN', status: 'OPEN' },
    { title: 'Revenue Declining MoM', severity: 'HIGH', category: 'REVENUE', status: 'OPEN' },
  ],
  pendingActions: [
    { title: 'Schedule emergency board call re: runway', priority: 'HIGH', status: 'PENDING' },
  ],
}

describe('MeetingPrepAgent', () => {
  let agent: MeetingPrepAgent

  beforeEach(() => {
    agent = new MeetingPrepAgent()
  })

  describe('generate() — rule-based fallback', () => {
    it('returns a MeetingBrief with all required fields', async () => {
      const brief = await agent.generate(HEALTHY_INPUT)
      expect(brief.companyName).toBe('GrowthCo')
      expect(brief.generatedAt).toBeInstanceOf(Date)
      expect(brief.healthTrajectory).toBeTruthy()
      expect(brief.openRisksSection).toBeTruthy()
      expect(brief.pendingActionsSection).toBeTruthy()
      expect(Array.isArray(brief.discussionTopics)).toBe(true)
      expect(Array.isArray(brief.questionsToAsk)).toBe(true)
    })

    it('includes at least 3 discussion topics', async () => {
      const brief = await agent.generate(HEALTHY_INPUT)
      expect(brief.discussionTopics.length).toBeGreaterThanOrEqual(3)
    })

    it('includes at least 3 questions to ask', async () => {
      const brief = await agent.generate(HEALTHY_INPUT)
      expect(brief.questionsToAsk.length).toBeGreaterThanOrEqual(3)
    })

    it('mentions MRR in health trajectory for companies with metrics', async () => {
      const brief = await agent.generate(HEALTHY_INPUT)
      expect(brief.healthTrajectory).toMatch(/\$200K|\$165K|MRR/)
    })

    it('flags runway urgency for at-risk companies', async () => {
      const brief = await agent.generate(AT_RISK_INPUT)
      expect(brief.healthTrajectory.toLowerCase()).toMatch(/runway|4 months|critical/)
    })

    it('includes fundraising question for companies actively raising', async () => {
      const brief = await agent.generate(AT_RISK_INPUT)
      const allText = [...brief.questionsToAsk, ...brief.discussionTopics].join(' ').toLowerCase()
      expect(allText).toMatch(/fundrais|runway/)
    })

    it('includes distressed tone awareness in questions', async () => {
      const brief = await agent.generate(AT_RISK_INPUT)
      const allQuestions = brief.questionsToAsk.join(' ').toLowerCase()
      expect(allQuestions).toMatch(/cautious|concern|know about|something/i)
    })

    it('handles company with no risks gracefully', async () => {
      const input = { ...HEALTHY_INPUT, openRisks: [] }
      const brief = await agent.generate(input)
      expect(brief.openRisksSection.toLowerCase()).toContain('no high-severity')
    })

    it('handles company with no pending actions gracefully', async () => {
      const input = { ...HEALTHY_INPUT, pendingActions: [] }
      const brief = await agent.generate(input)
      expect(brief.pendingActionsSection.toLowerCase()).toContain('no pending')
    })

    it('handles empty metrics history', async () => {
      const input = { ...HEALTHY_INPUT, metricsHistory: [] }
      const brief = await agent.generate(input)
      expect(brief.healthTrajectory).toBeTruthy()
    })
  })

  describe('generate() — with OpenAI', () => {
    it('falls back to rule-based if OpenAI throws', async () => {
      const { getOpenAIClient } = await import('../client')
      vi.mocked(getOpenAIClient).mockReturnValueOnce({
        chat: {
          completions: {
            create: vi.fn().mockRejectedValueOnce(new Error('API error')),
          },
        },
      } as never)

      const brief = await agent.generate(HEALTHY_INPUT)
      expect(brief.companyName).toBe('GrowthCo')
    })

    it('uses OpenAI response when available', async () => {
      const { getOpenAIClient } = await import('../client')
      vi.mocked(getOpenAIClient).mockReturnValueOnce({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValueOnce({
              choices: [{
                message: {
                  content: JSON.stringify({
                    healthTrajectory: 'AI-generated trajectory.',
                    openRisksSection: 'AI-generated risks.',
                    pendingActionsSection: 'AI-generated actions.',
                    discussionTopics: ['AI topic 1', 'AI topic 2'],
                    questionsToAsk: ['AI question 1', 'AI question 2'],
                  }),
                },
              }],
            }),
          },
        },
      } as never)

      const brief = await agent.generate(HEALTHY_INPUT)
      expect(brief.healthTrajectory).toBe('AI-generated trajectory.')
      expect(brief.discussionTopics).toContain('AI topic 1')
    })
  })
})
