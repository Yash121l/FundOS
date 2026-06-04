import { describe, it, expect } from 'vitest'
import { TrendDetectionAgent } from '../trend-detection-agent'
import type { TrendDetectionInput } from '@fundos/types'

function makeUpdate(overrides: {
  id: string
  companyId: string
  companyName: string
  sector?: string
  wins?: string
  risks?: string
  fundraisingStatus?: string
  mrr?: number | null
  runway?: number | null
  headcount?: number | null
  hiringNeeds?: string | null
}): TrendDetectionInput['updates'][number] {
  return {
    id: overrides.id,
    companyId: overrides.companyId,
    period: '2026-06',
    submittedById: null,
    mrr: overrides.mrr ?? 100_000,
    burnRate: 80_000,
    cashBalance: overrides.runway != null ? overrides.runway * 80_000 : 960_000,
    runway: overrides.runway ?? 12,
    headcount: overrides.headcount ?? 20,
    fundraisingStatus: (overrides.fundraisingStatus ?? 'NOT_RAISING') as never,
    fundraisingNote: null,
    wins: overrides.wins ?? 'Shipped new feature.',
    risks: overrides.risks ?? 'Competitive pressure.',
    hiringNeeds: overrides.hiringNeeds ?? null,
    additionalNotes: null,
    aiSummary: null,
    aiProcessedAt: null,
    reviewedAt: null,
    reviewedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    company: {
      id: overrides.companyId,
      name: overrides.companyName,
      sector: (overrides.sector ?? 'SAAS') as never,
    },
  }
}

describe('TrendDetectionAgent', () => {
  const agent = new TrendDetectionAgent()

  it('returns empty findings when fewer than 3 updates provided', async () => {
    const input: TrendDetectionInput = {
      updates: [
        makeUpdate({ id: 'u1', companyId: 'c1', companyName: 'Alpha' }),
        makeUpdate({ id: 'u2', companyId: 'c2', companyName: 'Beta' }),
      ],
      metricsHistory: [],
    }
    const result = await agent.detect(input)
    expect(result.findings).toHaveLength(0)
  })

  it('detects a shared burn risk when 3+ companies have runway < 12 months', async () => {
    const input: TrendDetectionInput = {
      updates: [
        makeUpdate({ id: 'u1', companyId: 'c1', companyName: 'Alpha', runway: 5 }),
        makeUpdate({ id: 'u2', companyId: 'c2', companyName: 'Beta', runway: 8 }),
        makeUpdate({ id: 'u3', companyId: 'c3', companyName: 'Gamma', runway: 10 }),
        makeUpdate({ id: 'u4', companyId: 'c4', companyName: 'Delta', runway: 24 }), // healthy
      ],
      metricsHistory: [],
    }
    const result = await agent.detect(input)
    const burnTrend = result.findings.find((f) => f.category === 'SHARED_RISK')
    expect(burnTrend).toBeDefined()
    expect(burnTrend!.evidence.length).toBeGreaterThanOrEqual(3)
  })

  it('detects a fundraising wave when 3+ companies are actively raising', async () => {
    const input: TrendDetectionInput = {
      updates: [
        makeUpdate({ id: 'u1', companyId: 'c1', companyName: 'Alpha', fundraisingStatus: 'ACTIVELY_RAISING' }),
        makeUpdate({ id: 'u2', companyId: 'c2', companyName: 'Beta', fundraisingStatus: 'TERM_SHEET' }),
        makeUpdate({ id: 'u3', companyId: 'c3', companyName: 'Gamma', fundraisingStatus: 'ACTIVELY_RAISING' }),
        makeUpdate({ id: 'u4', companyId: 'c4', companyName: 'Delta', fundraisingStatus: 'NOT_RAISING' }),
      ],
      metricsHistory: [],
    }
    const result = await agent.detect(input)
    const fundTrend = result.findings.find((f) => f.category === 'FUNDRAISING')
    expect(fundTrend).toBeDefined()
    expect(fundTrend!.evidence.length).toBe(3)
  })

  it('detects a hiring pattern when 3+ companies report hiring needs', async () => {
    const input: TrendDetectionInput = {
      updates: [
        makeUpdate({ id: 'u1', companyId: 'c1', companyName: 'Alpha', hiringNeeds: 'Hiring 3 engineers' }),
        makeUpdate({ id: 'u2', companyId: 'c2', companyName: 'Beta', hiringNeeds: 'Looking for a Head of Sales' }),
        makeUpdate({ id: 'u3', companyId: 'c3', companyName: 'Gamma', hiringNeeds: 'Need senior ML engineer' }),
      ],
      metricsHistory: [],
    }
    const result = await agent.detect(input)
    const hiringTrend = result.findings.find((f) => f.category === 'HIRING_PATTERN')
    expect(hiringTrend).toBeDefined()
    expect(hiringTrend!.evidence.length).toBe(3)
  })

  it('detects shared risk keywords across narratives', async () => {
    const input: TrendDetectionInput = {
      updates: [
        makeUpdate({ id: 'u1', companyId: 'c1', companyName: 'Alpha', risks: 'Enterprise sales cycles are too long, slowing revenue.' }),
        makeUpdate({ id: 'u2', companyId: 'c2', companyName: 'Beta', risks: 'Sales cycle length is increasing; deals taking 6+ months.' }),
        makeUpdate({ id: 'u3', companyId: 'c3', companyName: 'Gamma', risks: 'Long sales cycles blocking Q2 targets.' }),
      ],
      metricsHistory: [],
    }
    const result = await agent.detect(input)
    const operationalTrend = result.findings.find((f) => f.category === 'OPERATIONAL')
    expect(operationalTrend).toBeDefined()
    expect(operationalTrend!.evidence.length).toBeGreaterThanOrEqual(3)
  })

  it('each finding has title, summary, category, severity, and evidence', async () => {
    const input: TrendDetectionInput = {
      updates: [
        makeUpdate({ id: 'u1', companyId: 'c1', companyName: 'Alpha', runway: 4 }),
        makeUpdate({ id: 'u2', companyId: 'c2', companyName: 'Beta', runway: 7 }),
        makeUpdate({ id: 'u3', companyId: 'c3', companyName: 'Gamma', runway: 9 }),
      ],
      metricsHistory: [],
    }
    const result = await agent.detect(input)
    for (const finding of result.findings) {
      expect(finding.title).toBeTruthy()
      expect(finding.summary).toBeTruthy()
      expect(finding.category).toBeTruthy()
      expect(finding.severity).toBeTruthy()
      expect(Array.isArray(finding.evidence)).toBe(true)
      expect(finding.evidence.length).toBeGreaterThanOrEqual(3)
      for (const ev of finding.evidence) {
        expect(ev.companyId).toBeTruthy()
        expect(ev.quote).toBeTruthy()
      }
    }
  })

  it('does not duplicate findings for the same company across multiple patterns', async () => {
    const input: TrendDetectionInput = {
      updates: [
        makeUpdate({ id: 'u1', companyId: 'c1', companyName: 'Alpha', runway: 5, fundraisingStatus: 'ACTIVELY_RAISING' }),
        makeUpdate({ id: 'u2', companyId: 'c2', companyName: 'Beta', runway: 8, fundraisingStatus: 'ACTIVELY_RAISING' }),
        makeUpdate({ id: 'u3', companyId: 'c3', companyName: 'Gamma', runway: 9, fundraisingStatus: 'ACTIVELY_RAISING' }),
      ],
      metricsHistory: [],
    }
    const result = await agent.detect(input)
    // Should find both burn risk AND fundraising — distinct findings
    expect(result.findings.length).toBeGreaterThanOrEqual(2)
    const categories = result.findings.map((f) => f.category)
    expect(categories).toContain('SHARED_RISK')
    expect(categories).toContain('FUNDRAISING')
  })
})
