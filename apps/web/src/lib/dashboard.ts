import { db } from '@fundos/database'
import { currentPeriod, previousPeriod } from '@fundos/shared'
import { withCache } from './cache'
import { z } from 'zod'

const AlertDigestSchema = z.object({
  weekOf: z.string(),
  totalAlerts: z.number(),
  overallSummary: z.string(),
  groups: z.array(z.object({
    category: z.string(),
    severity: z.enum(['critical', 'high', 'medium']),
    count: z.number(),
    companies: z.array(z.string()),
    narrative: z.string(),
    coordinatedAction: z.string(),
  })),
  generatedAt: z.string(),
})

function periodMonthsAgo(n: number): string {
  let p = currentPeriod()
  for (let i = 0; i < n; i++) p = previousPeriod(p)
  return p
}

// ── Health counts ────────────────────────────────────────────

export async function getHealthCounts() {
  return withCache('health_counts', 300, async () => {
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
  })
}

// ── Fund-level aggregates ────────────────────────────────────

export async function getFundMetrics() {
  return withCache('fund_metrics', 300, async () => {
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
  })
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

// ── Recent alerts ─────────────────────────────────────────────
// Alerts = recently created HIGH/CRITICAL risks (last 14 days)

export async function getRecentAlerts(limit = 6) {
  const since = new Date()
  since.setDate(since.getDate() - 14)

  const recentRisks = await db.risk.findMany({
    where: {
      severity: { in: ['HIGH', 'CRITICAL'] },
      status: 'OPEN',
      createdAt: { gte: since },
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      title: true,
      severity: true,
      category: true,
      createdAt: true,
      company: { select: { id: true, name: true, slug: true, healthStatus: true } },
    },
  })

  return recentRisks
}

export type RecentAlert = Awaited<ReturnType<typeof getRecentAlerts>>[number]

// ── Sidebar badge counts ─────────────────────────────────────

export async function getSidebarBadges() {
  const [updates, trends] = await Promise.all([
    db.founderUpdate.count({ where: { reviewedAt: null } }),
    db.trendFinding.count({ where: { status: 'ACTIVE' } }),
  ])
  return { updates, trends }
}

// ── Weekly alert digest ──────────────────────────────────────
// Returns the most recent AI-generated digest from AuditLog,
// or falls back to a fresh grouping of recent high-severity risks.

export async function getLatestAlertDigest() {
  const stored = await db.auditLog.findFirst({
    where: { action: 'WEEKLY_ALERT_DIGEST' },
    orderBy: { createdAt: 'desc' },
    select: { metadata: true, createdAt: true },
  })

  if (stored?.metadata) {
    const parsed = AlertDigestSchema.safeParse(stored.metadata)
    if (parsed.success) return parsed.data
    console.warn('[getLatestAlertDigest] stored metadata failed validation — ignoring', stored.metadata)
  }

  return null
}

export async function getWeeklyAlertsForDigest() {
  const since = new Date()
  since.setDate(since.getDate() - 7)

  const risks = await db.risk.findMany({
    where: {
      severity: { in: ['HIGH', 'CRITICAL'] },
      status: 'OPEN',
      createdAt: { gte: since },
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    select: {
      title: true,
      severity: true,
      category: true,
      createdAt: true,
      company: { select: { name: true } },
    },
  })

  return risks.map((r) => ({
    title: r.title,
    severity: r.severity,
    category: r.category,
    createdAt: r.createdAt,
    companyName: r.company.name,
  }))
}
