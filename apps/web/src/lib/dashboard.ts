import { db } from '@fundos/database'

function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function periodMonthsAgo(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Health counts ────────────────────────────────────────────

export async function getHealthCounts() {
  const rows = await db.company.groupBy({
    by: ['healthStatus'],
    where: { status: 'ACTIVE' },
    _count: { id: true },
  })
  const map: Record<string, number> = {}
  for (const r of rows) map[r.healthStatus] = r._count.id
  return {
    HEALTHY: map['HEALTHY'] ?? 0,
    WATCHLIST: map['WATCHLIST'] ?? 0,
    AT_RISK: map['AT_RISK'] ?? 0,
  }
}

// ── Fund-level aggregates ────────────────────────────────────

export async function getFundMetrics() {
  const period = currentPeriod()
  const prevPeriod = periodMonthsAgo(3)

  const [current, prev] = await Promise.all([
    db.metricSnapshot.findMany({
      where: { period },
      select: { mrr: true, burnRate: true, runway: true, revenueGrowthMom: true, headcount: true },
    }),
    db.metricSnapshot.findMany({
      where: { period: prevPeriod },
      select: { mrr: true, burnRate: true },
    }),
  ])

  const totalMrr = current.reduce((s, r) => s + (r.mrr ?? 0), 0)
  const totalBurn = current.reduce((s, r) => s + (r.burnRate ?? 0), 0)
  const totalHeadcount = current.reduce((s, r) => s + (r.headcount ?? 0), 0)

  const growthVals = current.map((r) => r.revenueGrowthMom).filter((v): v is number => v != null)
  const runwayVals = current.map((r) => r.runway).filter((v): v is number => v != null)
  const avgGrowth = growthVals.length ? growthVals.reduce((a, b) => a + b, 0) / growthVals.length : 0
  const avgRunway = runwayVals.length ? runwayVals.reduce((a, b) => a + b, 0) / runwayVals.length : 0

  const prevMrr = prev.reduce((s, r) => s + (r.mrr ?? 0), 0)
  const prevBurn = prev.reduce((s, r) => s + (r.burnRate ?? 0), 0)

  return {
    totalMrr,
    totalArr: totalMrr * 12,
    totalBurn,
    totalHeadcount,
    avgGrowth,
    avgRunway,
    mrrDelta: prevMrr > 0 ? (totalMrr - prevMrr) / prevMrr : null,
    burnDelta: prevBurn > 0 ? (totalBurn - prevBurn) / prevBurn : null,
  }
}

// ── Companies needing attention ──────────────────────────────

export async function getAtRiskCompanies() {
  const period = currentPeriod()

  const companies = await db.company.findMany({
    where: {
      status: 'ACTIVE',
      healthStatus: { in: ['AT_RISK', 'WATCHLIST'] },
    },
    select: {
      id: true, name: true, slug: true,
      sector: true, stage: true,
      healthStatus: true, healthScore: true,
      metrics: {
        where: { period },
        select: { mrr: true, revenueGrowthMom: true, runway: true, burnRate: true },
        take: 1,
      },
    },
    orderBy: { healthScore: 'asc' },
  })

  // Fetch open high-severity risks for these companies in one query
  const companyIds = companies.map((c) => c.id)
  const topRisks = await db.risk.findMany({
    where: {
      companyId: { in: companyIds },
      status: 'OPEN',
      severity: { in: ['HIGH', 'CRITICAL'] },
    },
    orderBy: { severity: 'desc' },
    select: { companyId: true, title: true, severity: true },
  })
  const riskByCompany = new Map(topRisks.map((r) => [r.companyId, r]))

  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    sector: c.sector,
    stage: c.stage,
    healthStatus: c.healthStatus,
    healthScore: c.healthScore,
    latestMetrics: c.metrics[0] ?? null,
    topRisk: riskByCompany.get(c.id) ?? null,
  }))
}

// ── Recent founder updates ───────────────────────────────────

export async function getRecentUpdates(limit = 5) {
  const updates = await db.founderUpdate.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true, period: true, createdAt: true,
      reviewedAt: true, aiSummary: true,
      mrr: true, runway: true,
      fundraisingStatus: true,
      company: {
        select: {
          id: true, name: true, slug: true,
          healthStatus: true, sector: true,
        },
      },
    },
  })
  return updates
}

export type RecentUpdate = Awaited<ReturnType<typeof getRecentUpdates>>[number]

// ── Active trends ────────────────────────────────────────────

export async function getActiveTrends(limit = 4) {
  return db.trendFinding.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ severity: 'desc' }, { affectedCount: 'desc' }],
    take: limit,
    select: {
      id: true, title: true, summary: true,
      category: true, severity: true, affectedCount: true,
      evidence: {
        take: 4,
        select: { company: { select: { name: true, slug: true } } },
      },
    },
  })
}

export type ActiveTrend = Awaited<ReturnType<typeof getActiveTrends>>[number]

// ── Sidebar badge counts ─────────────────────────────────────

export async function getSidebarBadges() {
  const [updates, trends] = await Promise.all([
    db.founderUpdate.count({ where: { reviewedAt: null } }),
    db.trendFinding.count({ where: { status: 'ACTIVE' } }),
  ])
  return { updates, trends }
}
