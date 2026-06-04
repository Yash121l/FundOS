'use server'

import { db } from '@fundos/database'
import { computeHealthScore, classifyHealth } from '@fundos/analytics'
import { PortfolioAnalyst } from '@fundos/ai'
import type { PortfolioAnalystOutput } from '@fundos/types'
import { revalidatePath } from 'next/cache'

// ── Mark an update as reviewed ───────────────────────────────

export async function markUpdateReviewed(id: string): Promise<{ success: boolean }> {
  await db.founderUpdate.update({
    where: { id },
    data: { reviewedAt: new Date() },
  })
  revalidatePath('/updates')
  return { success: true }
}

export async function createTaskFromUpdate(
  companyId: string,
  title: string,
  description: string
): Promise<{ success: boolean; taskId: string }> {
  const task = await db.task.create({
    data: {
      companyId,
      title,
      description: description || null,
      priority: 'MEDIUM',
      status: 'TODO',
      createdById: 'SYSTEM', // replaced with Clerk userId when auth is wired
    },
  })
  revalidatePath(`/portfolio`)
  return { success: true, taskId: task.id }
}

// ── Submit a new founder update ──────────────────────────────

export interface UpdateFormData {
  companyId: string
  period: string
  mrr: number | null
  burnRate: number | null
  cashBalance: number | null
  headcount: number | null
  fundraisingStatus: string
  fundraisingNote: string
  wins: string
  risks: string
  hiringNeeds: string
  additionalNotes: string
}

export async function submitFounderUpdate(
  data: UpdateFormData
): Promise<{ success: boolean; updateId: string }> {
  const {
    companyId, period, mrr, burnRate, cashBalance, headcount,
    fundraisingStatus, fundraisingNote, wins, risks, hiringNeeds, additionalNotes,
  } = data

  // Auto-compute runway from inputs
  const runway = cashBalance != null && burnRate != null && burnRate > 0
    ? Math.round((cashBalance / burnRate) * 10) / 10
    : null

  // Auto-compute MoM growth from previous period metrics
  const previousMetrics = await db.metricSnapshot.findFirst({
    where: { companyId },
    orderBy: { period: 'desc' },
    select: { mrr: true, period: true },
  })

  const revenueGrowthMom =
    mrr != null && previousMetrics?.mrr != null && previousMetrics.mrr > 0
      ? (mrr - previousMetrics.mrr) / previousMetrics.mrr
      : null

  // 1. Create the FounderUpdate record
  const update = await db.founderUpdate.create({
    data: {
      companyId,
      period,
      mrr,
      burnRate,
      cashBalance,
      runway,
      headcount,
      fundraisingStatus: fundraisingStatus as never,
      fundraisingNote: fundraisingNote || null,
      wins,
      risks,
      hiringNeeds: hiringNeeds || null,
      additionalNotes: additionalNotes || null,
    },
  })

  // 2. Upsert the MetricSnapshot for this period
  await db.metricSnapshot.upsert({
    where: { companyId_period: { companyId, period } },
    create: {
      companyId, period,
      mrr, arr: mrr != null ? mrr * 12 : null,
      burnRate, cashBalance, runway, headcount,
      revenueGrowthMom,
      source: 'FOUNDER_UPDATE',
    },
    update: {
      mrr, arr: mrr != null ? mrr * 12 : null,
      burnRate, cashBalance, runway, headcount,
      revenueGrowthMom,
      source: 'FOUNDER_UPDATE',
    },
  })

  // 3. Run the PortfolioAnalyst
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId } })
  const metricsHistory = await db.metricSnapshot.findMany({
    where: { companyId },
    orderBy: { period: 'desc' },
    take: 6,
  })
  const previousUpdates = await db.founderUpdate.findMany({
    where: { companyId, id: { not: update.id } },
    orderBy: { period: 'desc' },
    take: 3,
  })

  const analyst = new PortfolioAnalyst()
  const analysis = await analyst.analyze({
    company: company as never,
    latestUpdate: { ...update, detectedRisks: [], opportunities: [], actions: [] } as never,
    metricsHistory: metricsHistory as never,
    previousUpdates: previousUpdates as never,
  })

  // 4. Persist risks detected by analyst
  if (analysis.risks.length > 0) {
    await db.risk.createMany({
      data: analysis.risks.map((r: PortfolioAnalystOutput['risks'][number]) => ({
        companyId,
        updateId: update.id,
        title: r.title,
        description: r.description,
        severity: r.severity,
        category: r.category,
        source: r.source ?? 'ai',
        status: r.status,
      })),
    })
  }

  // 5. Persist opportunities
  if (analysis.opportunities.length > 0) {
    await db.opportunity.createMany({
      data: analysis.opportunities.map((o: PortfolioAnalystOutput['opportunities'][number]) => ({
        companyId,
        updateId: update.id,
        title: o.title,
        description: o.description,
        category: o.category,
        status: o.status,
      })),
    })
  }

  // 6. Persist suggested actions
  if (analysis.suggestedActions.length > 0) {
    await db.action.createMany({
      data: analysis.suggestedActions.map((a: PortfolioAnalystOutput['suggestedActions'][number]) => ({
        companyId,
        updateId: update.id,
        title: a.title,
        description: a.description ?? null,
        priority: a.priority,
        status: a.status,
      })),
    })
  }

  // 8. Re-compute and persist updated health score
  const healthResult = computeHealthScore(metricsHistory as never)
  const healthStatus = classifyHealth(healthResult.score)

  await db.company.update({
    where: { id: companyId },
    data: {
      healthScore: healthResult.score,
      healthStatus,
    },
  })

  // 9. Update MetricSnapshot with new health score
  await db.metricSnapshot.updateMany({
    where: { companyId, period },
    data: { healthScore: healthResult.score },
  })

  // 10. Write AI summary back to the update
  await db.founderUpdate.update({
    where: { id: update.id },
    data: {
      aiSummary: analysis.healthSummary,
      aiProcessedAt: new Date(),
    },
  })

  revalidatePath('/updates')
  revalidatePath('/')
  revalidatePath(`/portfolio/${company.slug}`)

  return { success: true, updateId: update.id }
}
