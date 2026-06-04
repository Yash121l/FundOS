import { task, schedules } from '@trigger.dev/sdk/v3'
import { db } from '@fundos/database'
import { TrendDetectionAgent, writeAIAuditLog } from '@fundos/ai'
import type { TrendDetectionInput } from '@fundos/types'

// Runs daily at 2am UTC, or after every 5th founder update
export const runTrendAnalysis = task({
  id: 'run-trend-analysis',
  maxDuration: 300,
  run: async (payload: { triggeredBy?: 'schedule' | 'update_threshold' } = {}) => {
    const since = new Date()
    since.setDate(since.getDate() - 90)

    // 1. Fetch all updates from last 90 days with company context
    const updates = await db.founderUpdate.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      include: { company: { select: { id: true, name: true, sector: true } } },
    })

    if (updates.length < 3) {
      return { skipped: true, reason: 'Fewer than 3 updates in window' }
    }

    const metricsHistory = await db.metricSnapshot.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { period: 'desc' },
    })

    // 2. Run TrendDetectionAgent
    const startedAt = Date.now()
    const agent = new TrendDetectionAgent()
    const result = await agent.detect({
      updates: updates as unknown as TrendDetectionInput['updates'],
      metricsHistory: metricsHistory as unknown as TrendDetectionInput['metricsHistory'],
    })
    const duration = Date.now() - startedAt

    await writeAIAuditLog({
      service: 'TrendDetectionAgent',
      model: 'rule-based-v1',
      promptTokens: 0,
      completionTokens: 0,
      durationMs: duration,
      entityType: 'Portfolio',
      entityId: 'fund',
      input: { updateCount: updates.length, daysBack: 90 },
      output: { findingsCount: result.findings.length },
      createdAt: new Date(),
    })

    const now = new Date()
    const periodStart = new Date(since)
    let upserted = 0

    // 3. Upsert findings — idempotent by (title, periodStart) unique constraint
    for (const finding of result.findings) {
      const trend = await db.trendFinding.upsert({
        where: { title_periodStart: { title: finding.title, periodStart } },
        create: {
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
        update: {
          summary: finding.summary,
          severity: finding.severity,
          affectedCount: finding.evidence.length,
          periodEnd: now,
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
          skipDuplicates: true,
        })
      }
      upserted++
    }

    return {
      updatesAnalyzed: updates.length,
      findingsDetected: result.findings.length,
      trendsCreated: upserted,
      triggeredBy: payload.triggeredBy ?? 'manual',
    }
  },
})

// Daily schedule at 2am UTC
export const trendAnalysisSchedule = schedules.task({
  id: 'trend-analysis-daily',
  cron: '0 2 * * *',
  run: async () => runTrendAnalysis.triggerAndWait({ triggeredBy: 'schedule' }),
})
