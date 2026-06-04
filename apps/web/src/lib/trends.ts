import { db } from '@fundos/database'

// ── Trends page data ─────────────────────────────────────────

export type TrendFilter = 'ALL' | 'SHARED_RISK' | 'HIRING_PATTERN' | 'FUNDRAISING' | 'GROWTH_PATTERN' | 'OPERATIONAL' | 'MARKET_EVENT'

export async function getTrendsForPage(filter: TrendFilter = 'ALL') {
  const where = filter === 'ALL' ? { status: 'ACTIVE' as const } : { status: 'ACTIVE' as const, category: filter as never }

  return db.trendFinding.findMany({
    where,
    orderBy: [{ severity: 'desc' }, { affectedCount: 'desc' }, { detectedAt: 'desc' }],
    select: {
      id: true,
      title: true,
      summary: true,
      category: true,
      severity: true,
      affectedCount: true,
      status: true,
      detectedAt: true,
      periodStart: true,
      periodEnd: true,
      evidence: {
        select: {
          id: true,
          quote: true,
          companyId: true,
          company: { select: { id: true, name: true, slug: true, healthStatus: true } },
        },
        take: 6,
      },
    },
  })
}

export type TrendItem = Awaited<ReturnType<typeof getTrendsForPage>>[number]

// ── Dismiss a trend ──────────────────────────────────────────

export async function getTrendCounts() {
  const [active, dismissed] = await Promise.all([
    db.trendFinding.count({ where: { status: 'ACTIVE' } }),
    db.trendFinding.count({ where: { status: 'DISMISSED' } }),
  ])
  return { active, dismissed }
}

// ── Data needed to run the detection job ─────────────────────

export async function getUpdatesForTrendDetection(daysBack = 90) {
  const since = new Date()
  since.setDate(since.getDate() - daysBack)

  return db.founderUpdate.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      companyId: true,
      period: true,
      submittedById: true,
      mrr: true,
      burnRate: true,
      cashBalance: true,
      runway: true,
      headcount: true,
      fundraisingStatus: true,
      fundraisingNote: true,
      wins: true,
      risks: true,
      hiringNeeds: true,
      additionalNotes: true,
      aiSummary: true,
      founderTone: true,
      aiProcessedAt: true,
      reviewedAt: true,
      reviewedById: true,
      createdAt: true,
      updatedAt: true,
      company: { select: { id: true, name: true, sector: true } },
    },
  })
}
