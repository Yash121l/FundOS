import { describe, it, expect } from 'vitest'
import { computeHealthScore, classifyHealth } from '../index'
import type { MetricSnapshot } from '@fundos/types'

function makeSnapshot(overrides: Partial<MetricSnapshot> = {}): MetricSnapshot {
  return {
    id: 'snap-1',
    companyId: 'co-1',
    period: '2026-06',
    mrr: 100_000,
    arr: 1_200_000,
    revenueGrowthMom: 0.10,
    revenueGrowthYoy: null,
    burnRate: 80_000,
    cashBalance: 2_000_000,
    runway: 25,
    headcount: 20,
    headcountChange: null,
    grossMargin: 0.7,
    nrr: 110,
    healthScore: null,
    source: 'MANUAL',
    createdAt: new Date(),
    ...overrides,
  }
}

describe('classifyHealth', () => {
  it('returns HEALTHY for score >= 65', () => {
    expect(classifyHealth(65)).toBe('HEALTHY')
    expect(classifyHealth(100)).toBe('HEALTHY')
  })

  it('returns WATCHLIST for score 40–64', () => {
    expect(classifyHealth(40)).toBe('WATCHLIST')
    expect(classifyHealth(64)).toBe('WATCHLIST')
  })

  it('returns AT_RISK for score < 40', () => {
    expect(classifyHealth(39)).toBe('AT_RISK')
    expect(classifyHealth(0)).toBe('AT_RISK')
  })
})

describe('computeHealthScore', () => {
  it('returns 50/WATCHLIST defaults when no metrics provided', () => {
    const result = computeHealthScore([])
    expect(result.score).toBe(50)
    expect(result.status).toBe('WATCHLIST')
    expect(result.components.growth).toBe(50)
    expect(result.components.revenueTrend).toBe(50)
    expect(result.components.runway).toBe(50)
    expect(result.components.burnEfficiency).toBe(50)
  })

  it('returns HEALTHY for a strong company', () => {
    const metrics = [
      makeSnapshot({ mrr: 200_000, revenueGrowthMom: 0.15, runway: 24, burnRate: 50_000 }),
      makeSnapshot({ mrr: 170_000, period: '2026-05' }),
      makeSnapshot({ mrr: 150_000, period: '2026-04' }),
    ]
    const result = computeHealthScore(metrics)
    expect(result.status).toBe('HEALTHY')
    expect(result.score).toBeGreaterThanOrEqual(65)
  })

  it('returns AT_RISK for a struggling company', () => {
    const metrics = [
      makeSnapshot({
        mrr: 50_000,
        revenueGrowthMom: -0.10,
        runway: 4,
        burnRate: 500_000,
      }),
    ]
    const result = computeHealthScore(metrics)
    expect(result.status).toBe('AT_RISK')
    expect(result.score).toBeLessThan(40)
  })

  it('handles null metric fields gracefully (defaults to 50 per component)', () => {
    const metrics = [makeSnapshot({ revenueGrowthMom: null, runway: null, burnRate: null, mrr: null })]
    const result = computeHealthScore(metrics)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('score is always clamped to 0–100', () => {
    const extremeGood = [makeSnapshot({ revenueGrowthMom: 0.5, runway: 48, burnRate: 1_000, mrr: 1_000_000 })]
    const extremeBad = [makeSnapshot({ revenueGrowthMom: -0.5, runway: 1, burnRate: 10_000_000, mrr: 100 })]
    expect(computeHealthScore(extremeGood).score).toBeLessThanOrEqual(100)
    expect(computeHealthScore(extremeBad).score).toBeGreaterThanOrEqual(0)
  })

  it('uses weighted formula: growth 35%, revenueTrend 25%, runway 25%, burnEfficiency 15%', () => {
    // Only growth is perfect (>=15% MoM), everything else uses defaults (50)
    const metrics = [makeSnapshot({ revenueGrowthMom: 0.15, runway: null, burnRate: null, mrr: null })]
    const result = computeHealthScore(metrics)
    // growth=100, revenueTrend=50(only 1 snapshot), runway=50(null), burnEfficiency=50(null)
    // expected = round(100*0.35 + 50*0.25 + 50*0.25 + 50*0.15) = round(35+12.5+12.5+7.5) = round(67.5) = 68
    expect(result.components.growth).toBe(100)
    expect(result.score).toBe(68)
  })
})
