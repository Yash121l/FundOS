'use server'

import { db } from '@fundos/database'
import { MorAnalyzer } from '@fundos/ai'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from './auth'

// ── Types ────────────────────────────────────────────────────────────────────

export interface MorFormData {
  companyId: string
  period: string  // "YYYY-MM"

  // P&L actuals
  revenueSubscription?: number | null
  revenueServices?: number | null
  revenueOther?: number | null
  cogs?: number | null
  smExpenses?: number | null
  rdExpenses?: number | null
  gaExpenses?: number | null

  // vs budget
  budgetRevenue?: number | null
  budgetEbitda?: number | null

  // YTD
  ytdRevenue?: number | null
  ytdEbitda?: number | null
  ytdBudgetRevenue?: number | null
  ytdBudgetEbitda?: number | null

  // Cash & burn
  burnRate?: number | null
  cashBalance?: number | null
  bankBalance?: number | null

  // Headcount
  headcount?: number | null
  attrition?: number | null
  openRoles?: number | null

  // KPIs
  kpi1Label?: string
  kpi1Actual?: number | null
  kpi1Target?: number | null
  kpi2Label?: string
  kpi2Actual?: number | null
  kpi2Target?: number | null
  kpi3Label?: string
  kpi3Actual?: number | null
  kpi3Target?: number | null
  kpi4Label?: string
  kpi4Actual?: number | null
  kpi4Target?: number | null
  kpi5Label?: string
  kpi5Actual?: number | null
  kpi5Target?: number | null

  // Qualitative
  wins?: string
  misses?: string
  pivots?: string
  nextMonthPriorities?: string
  okrs?: string
  founderNotes?: string

  // Attachments
  attachmentUrl?: string | null
  attachmentLabel?: string | null
}

// ── Submit MOR ───────────────────────────────────────────────────────────────

export async function submitMOR(
  data: MorFormData
): Promise<{ success: boolean; morId: string }> {
  const user = await getCurrentUser()

  const { companyId, period } = data

  // Compute derived fields
  const revenueActual =
    (data.revenueSubscription ?? 0) +
    (data.revenueServices ?? 0) +
    (data.revenueOther ?? 0)

  const cogsTotal = data.cogs ?? 0
  const grossProfit = revenueActual - cogsTotal
  const grossMarginPct = revenueActual > 0 ? grossProfit / revenueActual : null

  const opex =
    (data.smExpenses ?? 0) + (data.rdExpenses ?? 0) + (data.gaExpenses ?? 0)
  const ebitda = grossProfit - opex

  const runway =
    data.cashBalance != null && data.burnRate != null && data.burnRate > 0
      ? data.cashBalance / data.burnRate
      : null

  // vs budget
  const revenueVsBudgetPct =
    data.budgetRevenue != null && data.budgetRevenue > 0
      ? (revenueActual - data.budgetRevenue) / data.budgetRevenue
      : null

  const ebitdaVsBudgetPct =
    data.budgetEbitda != null && data.budgetEbitda !== 0
      ? (ebitda - data.budgetEbitda) / Math.abs(data.budgetEbitda)
      : null

  // Due date: 10th of following month
  const [year, month] = period.split('-').map(Number)
  const dueDate = new Date(year!, month!, 10) // next month's 10th

  // Consecutive miss tracking
  const prevReports = await db.monthlyOperationsReport.findMany({
    where: { companyId },
    orderBy: { period: 'desc' },
    take: 2,
    select: { revenueVsBudgetPct: true, ebitdaVsBudgetPct: true },
  })

  const consecutiveRevenueMissMonths =
    prevReports.filter((r) => (r.revenueVsBudgetPct ?? 0) < -0.15).length
  const consecutiveBurnExcessMonths =
    prevReports.filter((r) => (r.ebitdaVsBudgetPct ?? 0) < -0.20).length

  // Upsert MOR
  const mor = await db.monthlyOperationsReport.upsert({
    where: { companyId_period: { companyId, period } },
    create: {
      companyId, period, dueDate,
      submittedAt: new Date(),
      submittedById: user?.id ?? null,
      status: 'SUBMITTED',
      revenueSubscription: data.revenueSubscription ?? null,
      revenueServices: data.revenueServices ?? null,
      revenueOther: data.revenueOther ?? null,
      cogs: cogsTotal || null,
      grossProfit: grossProfit || null,
      grossMarginPct,
      smExpenses: data.smExpenses ?? null,
      rdExpenses: data.rdExpenses ?? null,
      gaExpenses: data.gaExpenses ?? null,
      ebitda: ebitda || null,
      budgetRevenue: data.budgetRevenue ?? null,
      budgetEbitda: data.budgetEbitda ?? null,
      revenueVsBudgetPct,
      ebitdaVsBudgetPct,
      ytdRevenue: data.ytdRevenue ?? null,
      ytdEbitda: data.ytdEbitda ?? null,
      ytdBudgetRevenue: data.ytdBudgetRevenue ?? null,
      ytdBudgetEbitda: data.ytdBudgetEbitda ?? null,
      burnRate: data.burnRate ?? null,
      cashBalance: data.cashBalance ?? null,
      bankBalance: data.bankBalance ?? null,
      runway,
      headcount: data.headcount ?? null,
      attrition: data.attrition ?? null,
      openRoles: data.openRoles ?? null,
      kpi1Label: data.kpi1Label ?? null,
      kpi1Actual: data.kpi1Actual ?? null,
      kpi1Target: data.kpi1Target ?? null,
      kpi2Label: data.kpi2Label ?? null,
      kpi2Actual: data.kpi2Actual ?? null,
      kpi2Target: data.kpi2Target ?? null,
      kpi3Label: data.kpi3Label ?? null,
      kpi3Actual: data.kpi3Actual ?? null,
      kpi3Target: data.kpi3Target ?? null,
      kpi4Label: data.kpi4Label ?? null,
      kpi4Actual: data.kpi4Actual ?? null,
      kpi4Target: data.kpi4Target ?? null,
      kpi5Label: data.kpi5Label ?? null,
      kpi5Actual: data.kpi5Actual ?? null,
      kpi5Target: data.kpi5Target ?? null,
      wins: data.wins ?? null,
      misses: data.misses ?? null,
      pivots: data.pivots ?? null,
      nextMonthPriorities: data.nextMonthPriorities ?? null,
      okrs: data.okrs ?? null,
      founderNotes: data.founderNotes ?? null,
      attachmentUrl: data.attachmentUrl ?? null,
      attachmentLabel: data.attachmentLabel ?? null,
    },
    update: {
      submittedAt: new Date(),
      submittedById: user?.id ?? null,
      status: 'SUBMITTED',
      revenueSubscription: data.revenueSubscription ?? null,
      revenueServices: data.revenueServices ?? null,
      revenueOther: data.revenueOther ?? null,
      cogs: cogsTotal || null,
      grossProfit: grossProfit || null,
      grossMarginPct,
      smExpenses: data.smExpenses ?? null,
      rdExpenses: data.rdExpenses ?? null,
      gaExpenses: data.gaExpenses ?? null,
      ebitda: ebitda || null,
      budgetRevenue: data.budgetRevenue ?? null,
      budgetEbitda: data.budgetEbitda ?? null,
      revenueVsBudgetPct,
      ebitdaVsBudgetPct,
      ytdRevenue: data.ytdRevenue ?? null,
      ytdEbitda: data.ytdEbitda ?? null,
      ytdBudgetRevenue: data.ytdBudgetRevenue ?? null,
      ytdBudgetEbitda: data.ytdBudgetEbitda ?? null,
      burnRate: data.burnRate ?? null,
      cashBalance: data.cashBalance ?? null,
      bankBalance: data.bankBalance ?? null,
      runway,
      headcount: data.headcount ?? null,
      attrition: data.attrition ?? null,
      openRoles: data.openRoles ?? null,
      kpi1Label: data.kpi1Label ?? null,
      kpi1Actual: data.kpi1Actual ?? null,
      kpi1Target: data.kpi1Target ?? null,
      kpi2Label: data.kpi2Label ?? null,
      kpi2Actual: data.kpi2Actual ?? null,
      kpi2Target: data.kpi2Target ?? null,
      kpi3Label: data.kpi3Label ?? null,
      kpi3Actual: data.kpi3Actual ?? null,
      kpi3Target: data.kpi3Target ?? null,
      kpi4Label: data.kpi4Label ?? null,
      kpi4Actual: data.kpi4Actual ?? null,
      kpi4Target: data.kpi4Target ?? null,
      kpi5Label: data.kpi5Label ?? null,
      kpi5Actual: data.kpi5Actual ?? null,
      kpi5Target: data.kpi5Target ?? null,
      wins: data.wins ?? null,
      misses: data.misses ?? null,
      pivots: data.pivots ?? null,
      nextMonthPriorities: data.nextMonthPriorities ?? null,
      okrs: data.okrs ?? null,
      founderNotes: data.founderNotes ?? null,
      attachmentUrl: data.attachmentUrl ?? null,
      attachmentLabel: data.attachmentLabel ?? null,
    },
  })

  // Run AI analysis inline — errors are non-fatal
  try {
    await runMorAnalysis(mor.id, {
      companyId, period, revenueActual, ebitda, runway,
      revenueVsBudgetPct, ebitdaVsBudgetPct,
      burnRate: data.burnRate ?? null,
      headcount: data.headcount ?? null,
      attrition: data.attrition ?? null,
      wins: data.wins ?? null,
      misses: data.misses ?? null,
      pivots: data.pivots ?? null,
      founderNotes: data.founderNotes ?? null,
      consecutiveRevenueMissMonths,
      consecutiveBurnExcessMonths,
      kpis: buildKpiList(data),
    })
  } catch (err) {
    console.error('[runMorAnalysis] AI analysis failed for MOR', mor.id, err)
  }

  revalidatePath('/monitoring')
  revalidatePath('/')
  return { success: true, morId: mor.id }
}

// ── AI Analysis ──────────────────────────────────────────────────────────────

interface AnalysisCtx {
  companyId: string; period: string
  revenueActual: number; ebitda: number; runway: number | null
  revenueVsBudgetPct: number | null; ebitdaVsBudgetPct: number | null
  burnRate: number | null; headcount: number | null; attrition: number | null
  wins: string | null; misses: string | null; pivots: string | null; founderNotes: string | null
  consecutiveRevenueMissMonths: number; consecutiveBurnExcessMonths: number
  kpis: Array<{ label: string; actual: number; target: number }>
}

async function runMorAnalysis(morId: string, ctx: AnalysisCtx): Promise<void> {
  const company = await db.company.findUnique({
    where: { id: ctx.companyId },
    select: { name: true, sector: true },
  })
  if (!company) return

  const analyzer = new MorAnalyzer()
  const result = await analyzer.analyze({
    companyId: ctx.companyId,
    companyName: company.name,
    sector: company.sector,
    period: ctx.period,
    revenueActual: ctx.revenueActual,
    ebitdaActual: ctx.ebitda,
    burnRate: ctx.burnRate,
    cashBalance: null,
    runway: ctx.runway,
    revenueVsBudgetPct: ctx.revenueVsBudgetPct,
    ebitdaVsBudgetPct: ctx.ebitdaVsBudgetPct,
    headcount: ctx.headcount,
    attrition: ctx.attrition,
    wins: ctx.wins,
    misses: ctx.misses,
    pivots: ctx.pivots,
    founderNotes: ctx.founderNotes,
    consecutiveRevenueMissMonths: ctx.consecutiveRevenueMissMonths,
    consecutiveBurnExcessMonths: ctx.consecutiveBurnExcessMonths,
    kpis: ctx.kpis,
  })

  // Save AI output back to MOR
  await db.monthlyOperationsReport.update({
    where: { id: morId },
    data: {
      aiSummary: result.summary,
      aiFlags: JSON.stringify(result.escalations),
      aiProcessedAt: new Date(),
      status: result.escalations.length > 0 ? 'ESCALATED' : 'SUBMITTED',
    },
  })

  // Create escalation records
  if (result.escalations.length > 0) {
    const VALID_ESCALATION_TYPES = new Set([
      'BURN_EXCESS', 'REVENUE_MISS', 'LOW_RUNWAY', 'TEAM_EVENT',
      'LEGAL', 'DOWN_ROUND', 'CUSTOMER_CONCENTRATION', 'LATE_SUBMISSION', 'OTHER',
    ])
    const VALID_SEVERITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
    const validEscalations = result.escalations.filter(
      (e) => VALID_ESCALATION_TYPES.has(e.type) && VALID_SEVERITIES.has(e.severity)
    )
    if (validEscalations.length > 0) {
      await db.morEscalation.createMany({
        data: validEscalations.map((e) => ({
          companyId: ctx.companyId,
          morId,
          type: e.type as never,
          severity: e.severity as never,
          title: e.title,
          details: e.details,
          escalatedToIC: e.escalateToIC,
          escalatedAt: e.escalateToIC ? new Date() : null,
          status: 'OPEN' as const,
        })),
        skipDuplicates: false,
      })
    }
  }
}

function buildKpiList(data: MorFormData) {
  const kpis: Array<{ label: string; actual: number; target: number }> = []
  for (let i = 1; i <= 5; i++) {
    const label = data[`kpi${i}Label` as keyof MorFormData] as string | undefined
    const actual = data[`kpi${i}Actual` as keyof MorFormData] as number | null | undefined
    const target = data[`kpi${i}Target` as keyof MorFormData] as number | null | undefined
    if (label && actual != null && target != null) {
      kpis.push({ label, actual, target })
    }
  }
  return kpis
}

// ── Review MOR ───────────────────────────────────────────────────────────────

export async function reviewMOR(morId: string): Promise<{ success: boolean }> {
  const user = await getCurrentUser()
  await db.monthlyOperationsReport.update({
    where: { id: morId },
    data: { status: 'REVIEWED', reviewedAt: new Date(), reviewedById: user?.id ?? null },
  })
  revalidatePath('/monitoring')
  return { success: true }
}

// ── Resolve escalation ───────────────────────────────────────────────────────

export async function resolveEscalation(
  escalationId: string,
  responseNote: string
): Promise<{ success: boolean }> {
  const user = await getCurrentUser()
  await db.morEscalation.update({
    where: { id: escalationId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy: user?.name ?? 'PM',
      responseNote,
    },
  })
  revalidatePath('/monitoring')
  return { success: true }
}

export async function dismissEscalation(escalationId: string): Promise<{ success: boolean }> {
  await db.morEscalation.update({
    where: { id: escalationId },
    data: { status: 'DISMISSED' },
  })
  revalidatePath('/monitoring')
  return { success: true }
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getMonitoringDashboard() {
  const now = new Date()
  // Reporting period = previous calendar month (the month being reported on)
  // MOR due by 10th of current calendar month
  const reportingYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const reportingMonthNum = now.getMonth() === 0 ? 12 : now.getMonth()
  const reportingPeriod = `${reportingYear}-${String(reportingMonthNum).padStart(2, '0')}`
  const dueDateThisMonth = new Date(now.getFullYear(), now.getMonth(), 10, 23, 59, 59)
  const isPastDue = now > dueDateThisMonth

  const [companies, mors, escalations] = await Promise.all([
    db.company.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, slug: true, healthStatus: true, sector: true },
      orderBy: { name: 'asc' },
    }),
    db.monthlyOperationsReport.findMany({
      where: { period: reportingPeriod },
      select: {
        id: true, companyId: true, period: true, status: true,
        dueDate: true, submittedAt: true, reviewedAt: true,
        revenueVsBudgetPct: true, ebitdaVsBudgetPct: true,
        runway: true, aiSummary: true, aiFlags: true,
      },
    }),
    db.morEscalation.findMany({
      where: { status: 'OPEN' },
      orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
      take: 20,
      select: {
        id: true, companyId: true, type: true, severity: true,
        title: true, details: true, escalatedToIC: true,
        detectedAt: true, status: true,
        company: { select: { name: true, slug: true } },
      },
    }),
  ])

  const morByCompany = Object.fromEntries(mors.map((m) => [m.companyId, m]))

  // IDs of companies that already have an open LATE_SUBMISSION escalation this period
  const existingLateEscalationCompanyIds = new Set(
    escalations
      .filter((e) => e.type === 'LATE_SUBMISSION')
      .map((e) => e.companyId)
  )

  const complianceRows = companies.map((c) => {
    const mor = morByCompany[c.id]
    const submitted = !!mor && mor.status !== 'PENDING'
    const isLate = isPastDue && !submitted
    return {
      ...c,
      mor: mor ?? null,
      isLate,
      daysOverdue: isLate ? Math.floor((now.getTime() - dueDateThisMonth.getTime()) / (1000 * 60 * 60 * 24)) : 0,
    }
  })

  // Auto-create LATE_SUBMISSION escalations for companies that are overdue
  const toFlag = complianceRows.filter(
    (r) => r.isLate && !existingLateEscalationCompanyIds.has(r.id)
  )
  if (toFlag.length > 0) {
    await db.morEscalation.createMany({
      data: toFlag.map((r) => ({
        companyId: r.id,
        type: 'LATE_SUBMISSION' as const,
        severity: 'LOW' as const,
        title: `MOR not submitted — ${reportingPeriod}`,
        details: `Monthly Operations Report for ${reportingPeriod} was due by the 10th. No submission received. PM reminder sent; escalate if pattern repeats 3+ months.`,
        status: 'OPEN' as const,
        escalatedToIC: false,
      })),
      skipDuplicates: true,
    })
  }

  const submittedCount = mors.filter((m) => m.status !== 'PENDING').length
  const lateCount = complianceRows.filter((r) => r.isLate).length

  return {
    complianceRows,
    escalations,
    submittedCount,
    lateCount,
    totalCompanies: companies.length,
    reportingPeriod,
    dueDateThisMonth,
    isPastDue,
  }
}

export type MonitoringDashboard = Awaited<ReturnType<typeof getMonitoringDashboard>>

export async function getMORList(page = 0, pageSize = 20) {
  return db.monthlyOperationsReport.findMany({
    orderBy: [{ period: 'desc' }, { submittedAt: 'desc' }],
    skip: page * pageSize,
    take: pageSize,
    select: {
      id: true, period: true, status: true, dueDate: true, submittedAt: true,
      reviewedAt: true, revenueVsBudgetPct: true, ebitdaVsBudgetPct: true,
      runway: true, aiSummary: true,
      company: { select: { id: true, name: true, slug: true, healthStatus: true } },
      escalations: { where: { status: 'OPEN' }, select: { severity: true } },
    },
  })
}

export type MORListItem = Awaited<ReturnType<typeof getMORList>>[number]

export async function getMORDetail(morId: string) {
  return db.monthlyOperationsReport.findUnique({
    where: { id: morId },
    include: {
      company: true,
      escalations: { orderBy: { detectedAt: 'desc' } },
    },
  })
}
