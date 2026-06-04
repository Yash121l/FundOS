import { describe, it, expect } from 'vitest'
import { aggregateFundMetrics } from '../index'
import type { CompanyWithMetrics, MetricSnapshot } from '@fundos/types'

function makeCompany(
  overrides: Omit<Partial<CompanyWithMetrics>, 'latestMetrics'> & { latestMetrics?: Partial<MetricSnapshot> | null } = {}
): CompanyWithMetrics {
  const { latestMetrics: metricsOverride, ...rest } = overrides
  const base: CompanyWithMetrics = {
    id: 'co-1',
    name: 'Acme',
    slug: 'acme',
    logoUrl: null,
    website: null,
    sector: 'SAAS',
    stage: 'SERIES_A',
    country: 'US',
    foundedYear: 2020,
    description: null,
    status: 'ACTIVE',
    healthStatus: 'HEALTHY',
    healthScore: 75,
    latestMetricsId: 'snap-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    latestMetrics: {
      id: 'snap-1',
      companyId: 'co-1',
      period: '2026-06',
      mrr: 100_000,
      arr: 1_200_000,
      revenueGrowthMom: 0.10,
      revenueGrowthYoy: null,
      grossMargin: null,
      nrr: null,
      burnRate: 80_000,
      cashBalance: 2_000_000,
      runway: 25,
      headcount: 20,
      headcountChange: null,
      healthScore: null,
      source: 'MANUAL',
      createdAt: new Date(),
    },
    metricsHistory: [],
    ...rest,
  }
  if (metricsOverride === null) {
    base.latestMetrics = null
  } else if (metricsOverride) {
    base.latestMetrics = { ...base.latestMetrics!, ...metricsOverride }
  }
  return base
}

describe('aggregateFundMetrics', () => {
  it('returns zero aggregates for empty portfolio', () => {
    const result = aggregateFundMetrics([])
    expect(result.totalMrr).toBe(0)
    expect(result.totalArr).toBe(0)
    expect(result.totalBurn).toBe(0)
    expect(result.avgGrowthMom).toBe(0)
    expect(result.avgRunway).toBe(0)
    expect(result.totalHeadcount).toBe(0)
    expect(result.healthDistribution).toEqual({ healthy: 0, watchlist: 0, atRisk: 0 })
  })

  it('sums MRR and burn across active companies', () => {
    const companies = [
      makeCompany({ id: 'co-1', latestMetrics: { mrr: 100_000, burnRate: 80_000 } }),
      makeCompany({ id: 'co-2', latestMetrics: { mrr: 200_000, burnRate: 120_000 } }),
    ]
    const result = aggregateFundMetrics(companies)
    expect(result.totalMrr).toBe(300_000)
    expect(result.totalArr).toBe(3_600_000)
    expect(result.totalBurn).toBe(200_000)
  })

  it('excludes non-ACTIVE companies', () => {
    const companies = [
      makeCompany({ id: 'co-1', latestMetrics: { mrr: 100_000 } }),
      makeCompany({ id: 'co-2', status: 'EXITED', latestMetrics: { mrr: 999_999 } }),
    ]
    const result = aggregateFundMetrics(companies)
    expect(result.totalMrr).toBe(100_000)
  })

  it('handles companies with no metrics (latestMetrics null)', () => {
    const companies = [
      makeCompany({ id: 'co-1', latestMetrics: { mrr: 100_000, burnRate: 50_000 } }),
      makeCompany({ id: 'co-2', latestMetrics: null }),
    ]
    const result = aggregateFundMetrics(companies)
    expect(result.totalMrr).toBe(100_000)
    expect(result.totalBurn).toBe(50_000)
  })

  it('computes correct health distribution', () => {
    const companies = [
      makeCompany({ id: 'co-1', healthStatus: 'HEALTHY' }),
      makeCompany({ id: 'co-2', healthStatus: 'HEALTHY' }),
      makeCompany({ id: 'co-3', healthStatus: 'WATCHLIST' }),
      makeCompany({ id: 'co-4', healthStatus: 'AT_RISK' }),
    ]
    const result = aggregateFundMetrics(companies)
    expect(result.healthDistribution).toEqual({ healthy: 2, watchlist: 1, atRisk: 1 })
  })

  it('averages growth MoM and runway across companies with data', () => {
    const companies = [
      makeCompany({ id: 'co-1', latestMetrics: { revenueGrowthMom: 0.10, runway: 20 } }),
      makeCompany({ id: 'co-2', latestMetrics: { revenueGrowthMom: 0.20, runway: 30 } }),
    ]
    const result = aggregateFundMetrics(companies)
    expect(result.avgGrowthMom).toBeCloseTo(0.15)
    expect(result.avgRunway).toBeCloseTo(25)
  })
})
