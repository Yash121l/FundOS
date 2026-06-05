import { db } from '@fundos/database'
import type { AskContext } from '@fundos/types'
import { getFundMetrics, getActiveTrends, getRecentAlerts } from './dashboard'
import { withCache } from './cache'

async function fetchAskContext(): Promise<AskContext> {
  try {
    const [companies, fundMetrics, activeTrends, activeRisks, recentUpdateRows] = await Promise.all([
      db.company.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          slug: true,
          sector: true,
          stage: true,
          healthStatus: true,
          healthScore: true,
          description: true,
          metrics: {
            orderBy: { period: 'desc' },
            take: 4, // current + 3 prior months for trend analysis
            select: {
              period: true,
              mrr: true,
              revenueGrowthMom: true,
              burnRate: true,
              runway: true,
              headcount: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      getFundMetrics(),
      getActiveTrends(10),
      getRecentAlerts(20),
      db.founderUpdate.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          period: true,
          wins: true,
          risks: true,
          mrr: true,
          runway: true,
          fundraisingStatus: true,
          company: { select: { name: true } },
        },
      }),
    ])

    return {
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        sector: c.sector,
        stage: c.stage,
        healthStatus: c.healthStatus,
        healthScore: c.healthScore,
        description: c.description,
        latestMetrics: c.metrics[0] ?? null,
        metricsHistory: c.metrics.map((m) => ({
          period: m.period,
          mrr: m.mrr,
          revenueGrowthMom: m.revenueGrowthMom,
          burnRate: m.burnRate,
          runway: m.runway,
        })),
      })),
      fundMetrics: {
        totalMrr: fundMetrics.totalMrr,
        totalArr: fundMetrics.totalArr,
        totalBurn: fundMetrics.totalBurn,
        avgGrowth: fundMetrics.avgGrowth,
        avgRunway: fundMetrics.avgRunway,
        totalHeadcount: fundMetrics.totalHeadcount,
      },
      recentUpdates: recentUpdateRows.map((u) => ({
        companyName: u.company.name,
        period: u.period,
        wins: u.wins,
        risks: u.risks,
        mrr: u.mrr,
        runway: u.runway,
        fundraisingStatus: u.fundraisingStatus,
      })),
      activeTrends: activeTrends.map((t) => ({
        title: t.title,
        summary: t.summary,
        category: t.category,
        severity: t.severity,
        affectedCount: t.affectedCount,
      })),
      activeRisks: activeRisks.map((r) => ({
        title: r.title,
        severity: r.severity,
        category: r.category,
        companyName: r.company.name,
      })),
      asOf: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    }
  } catch (error) {
    console.error('[ask-context] Failed to fetch portfolio context:', error)
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Unable to load portfolio context: ${message}`, { cause: error })
  }
}

export async function getAskContext(): Promise<AskContext> {
  return withCache('ask_context', 300, fetchAskContext)
}
