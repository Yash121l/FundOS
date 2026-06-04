import { describe, it, expect } from 'vitest'
import { computeGrowthTrend } from '../index'
import type { MetricSnapshot } from '@fundos/types'

function snap(growthMom: number | null, period = '2026-06'): MetricSnapshot {
  return {
    id: 'x', companyId: 'y', period,
    mrr: null, arr: null, revenueGrowthMom: growthMom,
    revenueGrowthYoy: null, grossMargin: null, nrr: null,
    burnRate: null, cashBalance: null, runway: null,
    headcount: null, headcountChange: null, healthScore: null,
    source: 'MANUAL', createdAt: new Date(),
  }
}

describe('computeGrowthTrend', () => {
  it('returns STABLE when fewer than 2 snapshots with growth data', () => {
    expect(computeGrowthTrend([])).toBe('STABLE')
    expect(computeGrowthTrend([snap(null)])).toBe('STABLE')
    expect(computeGrowthTrend([snap(0.1)])).toBe('STABLE')
  })

  it('returns ACCELERATING when recent growth is >2pp above older', () => {
    // recent=0.15, older=0.05 → delta=0.10 > 0.02 → ACCELERATING
    const metrics = [snap(0.15), snap(0.10), snap(0.05)]
    expect(computeGrowthTrend(metrics)).toBe('ACCELERATING')
  })

  it('returns DECELERATING when recent growth is >2pp below older', () => {
    // recent=0.03, older=0.15 → delta=-0.12 < -0.02 → DECELERATING
    const metrics = [snap(0.03), snap(0.10), snap(0.15)]
    expect(computeGrowthTrend(metrics)).toBe('DECELERATING')
  })

  it('returns STABLE when delta is within ±2pp', () => {
    const metrics = [snap(0.08), snap(0.07)]
    expect(computeGrowthTrend(metrics)).toBe('STABLE')
  })

  it('skips null values when computing trend', () => {
    // With nulls, filtered to [0.15, 0.05] → ACCELERATING
    const metrics = [snap(0.15), snap(null), snap(0.05)]
    expect(computeGrowthTrend(metrics)).toBe('ACCELERATING')
  })

  it('only uses the 4 most recent snapshots', () => {
    // Oldest 5th snapshot should be ignored
    const metrics = [snap(0.03), snap(0.04), snap(0.04), snap(0.03), snap(0.50)]
    expect(computeGrowthTrend(metrics)).toBe('STABLE')
  })
})
