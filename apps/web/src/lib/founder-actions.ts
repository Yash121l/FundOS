'use server'

import { db } from '@fundos/database'
import { tasks } from '@trigger.dev/sdk/v3'
import { PortfolioAnalyst, writeAIAuditLog } from '@fundos/ai'
import { computeHealthScore, classifyHealth } from '@fundos/analytics'
import { revalidatePath } from 'next/cache'
import { requireFounderAccess } from './auth'
import { submitMOR, type MorFormData } from './monitoring-actions'
import type { FundraisingStatus, NewsSubmissionType, Company, MetricSnapshot, FounderUpdate, PortfolioAnalystInput } from '@fundos/types'

// ── Submit a monthly founder update ─────────────────────────

export interface FounderUpdateFormData {
  period: string
  mrr: number | null
  burnRate: number | null
  cashBalance: number | null
  headcount: number | null
  fundraisingStatus: FundraisingStatus
  fundraisingNote: string
  wins: string
  risks: string
  hiringNeeds: string
  additionalNotes: string
}

export async function submitFounderMonthlyUpdate(
  data: FounderUpdateFormData
): Promise<{ success: boolean; updateId: string }> {
  const user = await requireFounderAccess()
  if (!user.companyId) throw new Error('No company linked to your account')

  const {
    period, mrr, burnRate, cashBalance, headcount,
    fundraisingStatus, fundraisingNote, wins, risks, hiringNeeds, additionalNotes,
  } = data

  const runway =
    cashBalance != null && burnRate != null && burnRate > 0
      ? Math.round((cashBalance / burnRate) * 10) / 10
      : null

  const previousMetrics = await db.metricSnapshot.findFirst({
    where: { companyId: user.companyId },
    orderBy: { period: 'desc' },
    select: { mrr: true },
  })

  const revenueGrowthMom =
    mrr != null && previousMetrics?.mrr != null && previousMetrics.mrr > 0
      ? (mrr - previousMetrics.mrr) / previousMetrics.mrr
      : null

  // Write both records atomically so the metric snapshot is never missing
  // when the background job runs immediately after.
  const [update] = await db.$transaction([
    db.founderUpdate.create({
      data: {
        companyId: user.companyId,
        period,
        submittedById: user.id,
        mrr,
        burnRate,
        cashBalance,
        runway,
        headcount,
        fundraisingStatus,
        fundraisingNote: fundraisingNote || null,
        wins,
        risks,
        hiringNeeds: hiringNeeds || null,
        additionalNotes: additionalNotes || null,
        source: 'WEB',
      },
    }),
    db.metricSnapshot.upsert({
      where: { companyId_period: { companyId: user.companyId, period } },
      create: {
        companyId: user.companyId, period,
        mrr, arr: mrr != null ? mrr * 12 : null,
        burnRate, cashBalance, runway, headcount, revenueGrowthMom,
        source: 'FOUNDER_UPDATE',
      },
      update: {
        mrr, arr: mrr != null ? mrr * 12 : null,
        burnRate, cashBalance, runway, headcount, revenueGrowthMom,
        source: 'FOUNDER_UPDATE',
      },
    }),
  ])

  // Prefer the Trigger.dev background job; fall back to inline execution when
  // Trigger.dev is not configured (local dev without TRIGGER_SECRET_KEY).
  try {
    await tasks.trigger('process-founder-update', { updateId: update.id, companyId: user.companyId })
  } catch {
    await runFounderUpdateAnalysis(update.id, user.companyId)
  }

  revalidatePath('/founder/dashboard')
  return { success: true, updateId: update.id }
}

// ── Founder submits their monthly MOR ───────────────────────

export async function submitFounderMOR(
  data: Omit<MorFormData, 'companyId'>
): Promise<{ success: boolean; morId: string }> {
  const user = await requireFounderAccess()
  if (!user.companyId) throw new Error('No company linked to your account')
  return submitMOR({ ...data, companyId: user.companyId })
}

// ── Submit weekly KPI ping ───────────────────────────────────

export interface WeeklyKpiPingData {
  week: string  // "YYYY-WXX"
  kpi1Label?: string; kpi1Value?: number | null
  kpi2Label?: string; kpi2Value?: number | null
  kpi3Label?: string; kpi3Value?: number | null
  kpi4Label?: string; kpi4Value?: number | null
  kpi5Label?: string; kpi5Value?: number | null
  founderNote?: string
}

export async function submitWeeklyKpiPing(
  data: WeeklyKpiPingData
): Promise<{ success: boolean; id: string }> {
  const user = await requireFounderAccess()
  if (!user.companyId) throw new Error('No company linked to your account')

  const ping = await db.weeklyKpiPing.upsert({
    where: { companyId_week: { companyId: user.companyId, week: data.week } },
    create: {
      companyId: user.companyId,
      submittedById: user.id,
      week: data.week,
      kpi1Label: data.kpi1Label ?? null,
      kpi1Value: data.kpi1Value ?? null,
      kpi2Label: data.kpi2Label ?? null,
      kpi2Value: data.kpi2Value ?? null,
      kpi3Label: data.kpi3Label ?? null,
      kpi3Value: data.kpi3Value ?? null,
      kpi4Label: data.kpi4Label ?? null,
      kpi4Value: data.kpi4Value ?? null,
      kpi5Label: data.kpi5Label ?? null,
      kpi5Value: data.kpi5Value ?? null,
      founderNote: data.founderNote ?? null,
    },
    update: {
      submittedById: user.id,
      submittedAt: new Date(),
      kpi1Label: data.kpi1Label ?? null,
      kpi1Value: data.kpi1Value ?? null,
      kpi2Label: data.kpi2Label ?? null,
      kpi2Value: data.kpi2Value ?? null,
      kpi3Label: data.kpi3Label ?? null,
      kpi3Value: data.kpi3Value ?? null,
      kpi4Label: data.kpi4Label ?? null,
      kpi4Value: data.kpi4Value ?? null,
      kpi5Label: data.kpi5Label ?? null,
      kpi5Value: data.kpi5Value ?? null,
      founderNote: data.founderNote ?? null,
    },
  })

  revalidatePath('/founder/dashboard')
  return { success: true, id: ping.id }
}

// ── Submit a news/signal item ────────────────────────────────

export interface FounderNewsFormData {
  type: NewsSubmissionType
  title: string
  description: string
  impact: string
  url: string
}

export async function submitFounderNews(
  data: FounderNewsFormData
): Promise<{ success: boolean; id: string }> {
  const user = await requireFounderAccess()
  if (!user.companyId) throw new Error('No company linked to your account')

  const { type, title, description, impact, url } = data

  const submission = await db.founderNewsSubmission.create({
    data: {
      companyId: user.companyId,
      submittedById: user.id,
      type,
      // Slice at the server boundary — the client validates length too, but
      // server-side caps are the authoritative limit against malformed requests.
      title: title.slice(0, 250),
      description: description.slice(0, 2000),
      impact: impact ? impact.slice(0, 500) : null,
      url: url ? url.slice(0, 500) : null,
    },
  })

  revalidatePath('/founder/dashboard')
  return { success: true, id: submission.id }
}

// ── Inline AI analysis (runs in Next.js process as fallback) ─

async function runFounderUpdateAnalysis(updateId: string, companyId: string): Promise<void> {
  const [update, company, metricsHistory, previousUpdates] = await Promise.all([
    db.founderUpdate.findUniqueOrThrow({ where: { id: updateId } }),
    db.company.findUniqueOrThrow({ where: { id: companyId } }),
    db.metricSnapshot.findMany({ where: { companyId }, orderBy: { period: 'desc' }, take: 6 }),
    // Last 3 updates for narrative context — excludes the one just created.
    db.founderUpdate.findMany({ where: { companyId, id: { not: updateId } }, orderBy: { period: 'desc' }, take: 3 }),
  ])

  const startedAt = Date.now()
  const analyst = new PortfolioAnalyst()
  const analysis = await analyst.analyze({
    company: company as unknown as Company,
    latestUpdate: update as unknown as PortfolioAnalystInput['latestUpdate'],
    metricsHistory: metricsHistory as unknown as MetricSnapshot[],
    previousUpdates: previousUpdates as unknown as FounderUpdate[],
  })
  const duration = Date.now() - startedAt

  await writeAIAuditLog({
    service: 'PortfolioAnalyst',
    model: process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : 'rule-based-v1',
    promptTokens: 0,
    completionTokens: 0,
    durationMs: duration,
    entityType: 'FounderUpdate',
    entityId: updateId,
    input: { companyId, period: update.period, source: 'FOUNDER_WEB' },
    output: { risksDetected: analysis.risks.length },
    createdAt: new Date(),
  })

  if (analysis.risks.length > 0) {
    await db.risk.createMany({
      data: analysis.risks.map((r) => ({
        companyId, updateId,
        title: r.title, description: r.description,
        severity: r.severity, category: r.category,
        source: r.source ?? 'ai', status: r.status,
      })),
      skipDuplicates: true,
    })
  }

  if (analysis.opportunities.length > 0) {
    await db.opportunity.createMany({
      data: analysis.opportunities.map((o) => ({
        companyId, updateId,
        title: o.title, description: o.description,
        category: o.category, status: o.status,
      })),
      skipDuplicates: true,
    })
  }

  const healthResult = computeHealthScore(metricsHistory as unknown as MetricSnapshot[])
  await db.company.update({
    where: { id: companyId },
    data: { healthScore: healthResult.score, healthStatus: classifyHealth(healthResult.score) },
  })

  await db.founderUpdate.update({
    where: { id: updateId },
    data: {
      aiSummary: analysis.healthSummary,
      founderTone: analysis.founderTone ?? null,
      aiProcessedAt: new Date(),
    },
  })
}
