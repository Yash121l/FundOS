import { db } from '@fundos/database'
import { currentPeriod, previousPeriod } from '@fundos/shared'

// ── Company detail for the founder dashboard ─────────────────

export async function getFounderCompany(companyId: string) {
  // Intentionally scoped select — founders must never receive cross-company
  // data, so we fetch by the companyId stored on their User record only.
  return db.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      sector: true,
      stage: true,
      country: true,
      website: true,
      foundedYear: true,
      description: true,
      healthStatus: true,
      healthScore: true,
      status: true,
      // 13 months = enough for a 1-year trailing chart.
      metrics: {
        orderBy: { period: 'desc' },
        take: 13,
        select: {
          period: true, mrr: true, arr: true, revenueGrowthMom: true,
          burnRate: true, cashBalance: true, runway: true, headcount: true, healthScore: true,
        },
      },
      updates: {
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true, period: true, createdAt: true, aiSummary: true, founderTone: true,
          mrr: true, burnRate: true, runway: true, headcount: true,
          wins: true, risks: true, fundraisingStatus: true, reviewedAt: true,
        },
      },
      // Only show open/in-progress risks — resolved ones are noise for founders.
      risks: {
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        orderBy: { severity: 'desc' },
        take: 5,
        select: { id: true, title: true, severity: true, category: true, status: true, createdAt: true },
      },
      newsSubmissions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, type: true, title: true, description: true, impact: true, url: true, createdAt: true },
      },
    },
  })
}

export type FounderCompany = NonNullable<Awaited<ReturnType<typeof getFounderCompany>>>

// ── KPI snapshot for the dashboard metric row ────────────────

export async function getFounderKPIs(companyId: string) {
  const period = currentPeriod()
  const prev = previousPeriod(period)

  // Fetch in parallel — these two queries are independent.
  const [current, previous] = await Promise.all([
    db.metricSnapshot.findFirst({
      where: { companyId, period },
      select: { mrr: true, burnRate: true, runway: true, headcount: true, revenueGrowthMom: true },
    }),
    db.metricSnapshot.findFirst({
      where: { companyId, period: prev },
      select: { mrr: true, burnRate: true, runway: true, headcount: true },
    }),
  ])

  return { current, previous, period, prev }
}

// ── Filed periods — drives the "suggested next period" logic ─

export async function getFounderFiledPeriods(companyId: string) {
  const updates = await db.founderUpdate.findMany({
    where: { companyId },
    select: { period: true },
    orderBy: { period: 'desc' },
  })
  return updates.map((u) => u.period)
}
