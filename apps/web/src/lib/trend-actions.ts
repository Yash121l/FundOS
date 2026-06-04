'use server'

import { db } from '@fundos/database'
import { TrendDetectionAgent } from '@fundos/ai'
import { revalidatePath } from 'next/cache'
import { getUpdatesForTrendDetection } from './trends'
import type { TrendDetectionInput } from '@fundos/types'

// ── Create an action linked to all companies in a trend ──────

export async function createActionFromTrend(
  trendId: string,
  title: string,
  description: string
): Promise<{ success: boolean; actionsCreated: number; error?: string }> {
  try {
    const trend = await db.trendFinding.findUnique({
      where: { id: trendId },
      select: { evidence: { select: { companyId: true }, distinct: ['companyId'] } },
    })

    if (!trend || trend.evidence.length === 0) return { success: false, actionsCreated: 0 }

    const companyIds = trend.evidence.map((e) => e.companyId)

    await db.$transaction([
      db.action.createMany({
        data: companyIds.map((companyId) => ({
          companyId,
          title,
          description: description || null,
          priority: 'MEDIUM' as const,
          status: 'PENDING' as const,
        })),
      }),
      db.trendFinding.update({
        where: { id: trendId },
        data: { status: 'ACTIONED' },
      }),
    ])

    revalidatePath('/trends')
    return { success: true, actionsCreated: companyIds.length }
  } catch (err) {
    console.error('[createActionFromTrend] failed', { trendId, err })
    return { success: false, actionsCreated: 0, error: 'Failed to create actions' }
  }
}

// ── Get dismissed trends ─────────────────────────────────────

export async function getDismissedTrends() {
  return db.trendFinding.findMany({
    where: { status: 'DISMISSED' },
    orderBy: { dismissedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      title: true,
      category: true,
      severity: true,
      affectedCount: true,
      dismissedAt: true,
    },
  })
}

export type DismissedTrend = Awaited<ReturnType<typeof getDismissedTrends>>[number]

// ── Restore a dismissed trend ────────────────────────────────

export async function restoreTrend(id: string): Promise<{ success: boolean }> {
  await db.trendFinding.update({
    where: { id },
    data: { status: 'ACTIVE', dismissedAt: null },
  })
  revalidatePath('/trends')
  return { success: true }
}

// ── Dismiss a trend ──────────────────────────────────────────

export async function dismissTrend(id: string): Promise<{ success: boolean }> {
  await db.trendFinding.update({
    where: { id },
    data: { status: 'DISMISSED', dismissedAt: new Date() },
  })
  revalidatePath('/trends')
  revalidatePath('/')
  return { success: true }
}

// ── Run trend analysis synchronously (for demo without workers) ──

export async function runTrendAnalysis(): Promise<{ found: number }> {
  const updates = await getUpdatesForTrendDetection(90)
  if (updates.length < 3) return { found: 0 }

  const agent = new TrendDetectionAgent()
  const typedUpdates: TrendDetectionInput['updates'] = updates
  const result = await agent.detect({
    updates: typedUpdates,
    metricsHistory: [],
  })

  if (result.findings.length === 0) return { found: 0 }

  const now = new Date()
  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - 90)

  for (const finding of result.findings) {
    const existing = await db.trendFinding.findFirst({
      where: { title: finding.title, status: 'ACTIVE' },
    })
    if (existing) continue

    const trend = await db.trendFinding.create({
      data: {
        title: finding.title,
        summary: finding.summary,
        category: finding.category,
        severity: finding.severity,
        affectedCount: finding.evidence.length,
        detectedAt: now,
        periodStart,
        periodEnd: now,
        status: 'ACTIVE',
      },
    })

    if (finding.evidence.length > 0) {
      await db.trendEvidence.createMany({
        data: finding.evidence.map((ev) => ({
          trendId: trend.id,
          companyId: ev.companyId,
          quote: ev.quote,
          updateId: ev.updateId ?? null,
        })),
      })
    }
  }

  revalidatePath('/trends')
  revalidatePath('/')
  return { found: result.findings.length }
}
