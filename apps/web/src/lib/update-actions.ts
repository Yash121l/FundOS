'use server'

import { db } from '@fundos/database'
import { tasks } from '@trigger.dev/sdk/v3'
import { PortfolioAnalyst, writeAIAuditLog } from '@fundos/ai'
import { computeHealthScore, classifyHealth } from '@fundos/analytics'
import type { FundraisingStatus, Company, MetricSnapshot, FounderUpdate, PortfolioAnalystInput } from '@fundos/types'
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
  fundraisingStatus: FundraisingStatus
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

  // 1 & 2. Create update + upsert metric snapshot atomically
  const [update] = await db.$transaction([
    db.founderUpdate.create({
      data: {
        companyId,
        period,
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
      },
    }),
    db.metricSnapshot.upsert({
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
    }),
  ])

  // 3. Trigger background worker for AI analysis; fall back to inline when Trigger.dev is not configured
  try {
    await tasks.trigger('process-founder-update', { updateId: update.id, companyId })
  } catch {
    await runAnalysisInline(update.id, companyId)
  }

  revalidatePath('/updates')
  revalidatePath('/')

  return { success: true, updateId: update.id }
}

// ── Inline analysis (runs in Next.js process when Trigger.dev is not configured) ──

async function runAnalysisInline(updateId: string, companyId: string): Promise<void> {
  const [update, company, metricsHistory, previousUpdates] = await Promise.all([
    db.founderUpdate.findUniqueOrThrow({ where: { id: updateId } }),
    db.company.findUniqueOrThrow({ where: { id: companyId } }),
    db.metricSnapshot.findMany({ where: { companyId }, orderBy: { period: 'desc' }, take: 6 }),
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
  const model = process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : 'rule-based-v1'

  await writeAIAuditLog({
    service: 'PortfolioAnalyst',
    model,
    promptTokens: 0,
    completionTokens: 0,
    durationMs: duration,
    entityType: 'FounderUpdate',
    entityId: updateId,
    input: { companyId, period: update.period },
    output: { risksDetected: analysis.risks.length, founderTone: analysis.founderTone },
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
