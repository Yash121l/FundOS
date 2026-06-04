'use server'

import { db } from '@fundos/database'
import { MeetingPrepAgent } from '@fundos/ai'
import type { MeetingBrief } from '@fundos/types'

// Module-level instance — MeetingPrepAgent is stateless and safe to reuse
const agent = new MeetingPrepAgent()

export async function generateMeetingPrep(companyId: string): Promise<MeetingBrief> {
  if (!companyId || typeof companyId !== 'string' || companyId.trim().length === 0) {
    throw new Error('companyId is required')
  }

  try {
    const company = await db.company.findUniqueOrThrow({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        sector: true,
        stage: true,
        healthStatus: true,
        healthScore: true,
        description: true,
        metrics: {
          orderBy: { period: 'desc' },
          take: 4,
          select: {
            period: true,
            mrr: true,
            revenueGrowthMom: true,
            burnRate: true,
            runway: true,
            headcount: true,
            healthScore: true,
          },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            period: true,
            wins: true,
            risks: true,
            mrr: true,
            runway: true,
            fundraisingStatus: true,
            aiSummary: true,
            founderTone: true,
          },
        },
        risks: {
          where: { status: { not: 'DISMISSED' } },
          orderBy: [{ severity: 'desc' }, { status: 'asc' }],
          take: 8,
          select: { title: true, severity: true, category: true, status: true },
        },
        actions: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          orderBy: { priority: 'desc' },
          take: 6,
          select: { title: true, priority: true, status: true },
        },
      },
    })

    return await agent.generate({
      company: {
        id: company.id,
        name: company.name,
        sector: company.sector,
        stage: company.stage,
        healthStatus: company.healthStatus,
        healthScore: company.healthScore,
        description: company.description,
      },
      metricsHistory: company.metrics,
      recentUpdates: company.updates,
      openRisks: company.risks,
      pendingActions: company.actions,
    })
  } catch (err) {
    console.error('[generateMeetingPrep] failed', {
      companyId,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}
