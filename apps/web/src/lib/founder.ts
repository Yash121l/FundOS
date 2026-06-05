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

// ── MOR status for founder portal ────────────────────────────

export async function getFounderMORStatus(companyId: string) {
  const now = new Date()
  // The MOR currently "in window":
  // Reporting period = previous calendar month (report on month that just ended)
  // Due date = 10th of the current calendar month
  const reportingYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const reportingMonthNum = now.getMonth() === 0 ? 12 : now.getMonth()
  const reportingPeriod = `${reportingYear}-${String(reportingMonthNum).padStart(2, '0')}`
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 10, 23, 59, 59)

  const [currentMor, recentMors, currentWeekPing] = await Promise.all([
    db.monthlyOperationsReport.findUnique({
      where: { companyId_period: { companyId, period: reportingPeriod } },
      select: { id: true, status: true, submittedAt: true, aiSummary: true, period: true, escalations: { where: { status: 'OPEN' }, select: { severity: true, title: true } } },
    }),
    db.monthlyOperationsReport.findMany({
      where: { companyId },
      orderBy: { period: 'desc' },
      take: 6,
      select: { id: true, period: true, status: true, submittedAt: true, aiSummary: true, revenueVsBudgetPct: true, runway: true },
    }),
    db.weeklyKpiPing.findFirst({
      where: { companyId, week: getISOWeek(now) },
      select: { id: true, week: true, submittedAt: true },
    }),
  ])

  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = now > dueDate && (!currentMor || currentMor.status === 'PENDING')
  const isSubmitted = !!currentMor && currentMor.status !== 'PENDING'
  const isDueSoon = !isSubmitted && daysUntilDue <= 5 && daysUntilDue >= 0

  return {
    reportingPeriod,
    dueDate,
    daysUntilDue,
    isOverdue,
    isSubmitted,
    isDueSoon,
    currentMor,
    recentMors,
    currentWeekPing,
    currentWeek: getISOWeek(now),
  }
}

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}
