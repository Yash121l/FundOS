'use server'

import { db } from '@fundos/database'
import { TrendDetectionAgent } from '@fundos/ai'
import { revalidatePath } from 'next/cache'
import { getUpdatesForTrendDetection } from './trends'

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
  const result = await agent.detect({ updates: updates as never, metricsHistory: [] })

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
