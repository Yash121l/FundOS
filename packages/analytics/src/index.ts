import type { MetricSnapshot, HealthStatus, HealthScore, GrowthTrend, FundAggregates, CompanyWithMetrics } from '@fundos/types'

// ==================
// HEALTH SCORING
// ==================

export function computeHealthScore(metrics: MetricSnapshot[]): HealthScore {
  if (metrics.length === 0) {
    return { score: 50, status: 'WATCHLIST', components: { growth: 50, revenueTrend: 50, runway: 50, burnEfficiency: 50 } }
  }

  const latest = metrics[0]!
  const growthScore = scoreGrowth(latest.revenueGrowthMom)
  const revenueTrendScore = scoreRevenueTrend(metrics)
  const runwayScore = scoreRunway(latest.runway)
  const burnEfficiencyScore = scoreBurnEfficiency(latest.burnRate, latest.mrr)

  const total = Math.round(
    growthScore * 0.35 +
    revenueTrendScore * 0.25 +
    runwayScore * 0.25 +
    burnEfficiencyScore * 0.15
  )

  return {
    score: Math.min(100, Math.max(0, total)),
    status: classifyHealth(total),
    components: {
      growth: growthScore,
      revenueTrend: revenueTrendScore,
      runway: runwayScore,
      burnEfficiency: burnEfficiencyScore,
    },
  }
}

export function classifyHealth(score: number): HealthStatus {
  if (score >= 65) return 'HEALTHY'
  if (score >= 40) return 'WATCHLIST'
  return 'AT_RISK'
}

function scoreGrowth(growthMom: number | null | undefined): number {
  if (growthMom == null) return 50
  if (growthMom >= 0.15) return 100
  if (growthMom >= 0.08) return 80
  if (growthMom >= 0.03) return 60
  if (growthMom >= 0) return 40
  if (growthMom >= -0.05) return 20
  return 5
}

function scoreRevenueTrend(metrics: MetricSnapshot[]): number {
  const last3 = metrics.slice(0, 3)
  if (last3.length < 2) return 50

  const mrrs = last3.map((m) => m.mrr).filter((v): v is number => v != null)
  if (mrrs.length < 2) return 50

  const oldest = mrrs[mrrs.length - 1]!
  const newest = mrrs[0]!
  if (oldest === 0) return 50

  const trend = (newest - oldest) / oldest
  if (trend > 0.1) return 90
  if (trend > 0.02) return 70
  if (trend > -0.02) return 50
  if (trend > -0.1) return 30
  return 10
}

function scoreRunway(runway: number | null | undefined): number {
  if (runway == null) return 50
  if (runway >= 24) return 100
  if (runway >= 18) return 85
  if (runway >= 12) return 70
  if (runway >= 9) return 55
  if (runway >= 6) return 35
  if (runway >= 3) return 15
  return 5
}

function scoreBurnEfficiency(burn: number | null | undefined, mrr: number | null | undefined): number {
  if (burn == null || mrr == null || mrr === 0) return 50
  const ratio = burn / mrr
  if (ratio <= 0.5) return 100
  if (ratio <= 1) return 80
  if (ratio <= 2) return 60
  if (ratio <= 3) return 40
  if (ratio <= 5) return 20
  return 5
}

// ==================
// GROWTH TREND
// ==================

export function computeGrowthTrend(metrics: MetricSnapshot[]): GrowthTrend {
  const withGrowth = metrics
    .slice(0, 4)
    .map((m) => m.revenueGrowthMom)
    .filter((v): v is number => v != null)

  if (withGrowth.length < 2) return 'STABLE'

  const recent = withGrowth[0]!
  const older = withGrowth[withGrowth.length - 1]!
  const delta = recent - older

  if (delta > 0.02) return 'ACCELERATING'
  if (delta < -0.02) return 'DECELERATING'
  return 'STABLE'
}

// ==================
// RUNWAY PROJECTION
// ==================

export function projectRunway(cashBalance: number, burnRate: number): number {
  if (burnRate <= 0) return 999
  return cashBalance / burnRate
}

// ==================
// FUND AGGREGATES
// ==================

export function aggregateFundMetrics(companies: CompanyWithMetrics[]): FundAggregates {
  const active = companies.filter((c) => c.status === 'ACTIVE')
  const withMetrics = active.filter((c) => c.latestMetrics != null)

  const totalMrr = sumMetric(withMetrics, (c) => c.latestMetrics?.mrr)
  const totalArr = totalMrr * 12
  const totalBurn = sumMetric(withMetrics, (c) => c.latestMetrics?.burnRate)
  const avgGrowthMom = avgMetric(withMetrics, (c) => c.latestMetrics?.revenueGrowthMom)
  const avgRunway = avgMetric(withMetrics, (c) => c.latestMetrics?.runway)
  const totalHeadcount = sumMetric(withMetrics, (c) => c.latestMetrics?.headcount)

  const distribution = active.reduce(
    (acc, c) => {
      if (c.healthStatus === 'HEALTHY') acc.healthy++
      else if (c.healthStatus === 'WATCHLIST') acc.watchlist++
      else acc.atRisk++
      return acc
    },
    { healthy: 0, watchlist: 0, atRisk: 0 }
  )

  return {
    totalMrr,
    totalArr,
    totalBurn,
    avgGrowthMom,
    avgRunway,
    totalHeadcount,
    healthDistribution: distribution,
  }
}

function sumMetric(
  companies: CompanyWithMetrics[],
  getter: (c: CompanyWithMetrics) => number | null | undefined
): number {
  return companies.reduce((sum, c) => sum + (getter(c) ?? 0), 0)
}

function avgMetric(
  companies: CompanyWithMetrics[],
  getter: (c: CompanyWithMetrics) => number | null | undefined
): number {
  const values = companies.map(getter).filter((v): v is number => v != null)
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

// ==================
// METRIC DELTAS
// ==================

export interface MetricDelta {
  current: number | null
  previous: number | null
  delta: number | null
  percentChange: number | null
  direction: 'up' | 'down' | 'flat' | null
}

export function computeDelta(current: number | null, previous: number | null): MetricDelta {
  if (current == null || previous == null) {
    return { current, previous, delta: null, percentChange: null, direction: null }
  }
  const delta = current - previous
  const percentChange = previous !== 0 ? delta / previous : null
  const direction = Math.abs(delta) < 0.001 * Math.abs(previous) ? 'flat' : delta > 0 ? 'up' : 'down'
  return { current, previous, delta, percentChange, direction }
}
