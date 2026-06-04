'use server'

import { db } from '@fundos/database'
import { tasks } from '@trigger.dev/sdk/v3'
import type { FundraisingStatus } from '@fundos/types'
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

  // 3. Trigger background worker for AI analysis, health scoring, and risk detection
  await tasks.trigger('process-founder-update', { updateId: update.id, companyId })

  revalidatePath('/updates')
  revalidatePath('/')

  return { success: true, updateId: update.id }
}
