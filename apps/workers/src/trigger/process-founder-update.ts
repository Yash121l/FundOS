import { task } from '@trigger.dev/sdk/v3'
import { db } from '@fundos/database'
import { computeHealthScore, classifyHealth } from '@fundos/analytics'
import { PortfolioAnalyst } from '@fundos/ai'
import { writeAIAuditLog } from '@fundos/ai'

export interface ProcessFounderUpdatePayload {
  updateId: string
  companyId: string
}

export const processFounderUpdate = task({
  id: 'process-founder-update',
  maxDuration: 120,
  run: async (payload: ProcessFounderUpdatePayload) => {
    const { updateId, companyId } = payload

    // 1. Fetch all necessary data
    const [update, company, metricsHistory, previousUpdates] = await Promise.all([
      db.founderUpdate.findUniqueOrThrow({
        where: { id: updateId },
        include: { detectedRisks: true, opportunities: true, actions: true },
      }),
      db.company.findUniqueOrThrow({ where: { id: companyId } }),
      db.metricSnapshot.findMany({
        where: { companyId },
        orderBy: { period: 'desc' },
        take: 6,
      }),
      db.founderUpdate.findMany({
        where: { companyId, id: { not: updateId } },
        orderBy: { period: 'desc' },
        take: 3,
      }),
    ])

    const startedAt = Date.now()

    // 2. Run PortfolioAnalyst
    const analyst = new PortfolioAnalyst()
    const analysis = await analyst.analyze({
      company: company as never,
      latestUpdate: update as never,
      metricsHistory: metricsHistory as never,
      previousUpdates: previousUpdates as never,
    })

    const duration = Date.now() - startedAt

    // 3. Write AI audit log
    await writeAIAuditLog({
      service: 'PortfolioAnalyst',
      model: 'rule-based-v1',
      promptTokens: 0,
      completionTokens: 0,
      durationMs: duration,
      entityType: 'FounderUpdate',
      entityId: updateId,
      input: { companyId, period: update.period, metricsCount: metricsHistory.length },
      output: { risksDetected: analysis.risks.length, opportunitiesDetected: analysis.opportunities.length },
      createdAt: new Date(),
    })

    // 4. Persist risks
    if (analysis.risks.length > 0) {
      await db.risk.createMany({
        data: analysis.risks.map((r) => ({
          companyId,
          updateId,
          title: r.title,
          description: r.description,
          severity: r.severity,
          category: r.category,
          source: r.source ?? 'ai',
          status: r.status,
        })),
        skipDuplicates: true,
      })
    }

    // 5. Persist opportunities
    if (analysis.opportunities.length > 0) {
      await db.opportunity.createMany({
        data: analysis.opportunities.map((o) => ({
          companyId,
          updateId,
          title: o.title,
          description: o.description,
          category: o.category,
          status: o.status,
        })),
        skipDuplicates: true,
      })
    }

    // 6. Update company health score
    const healthResult = computeHealthScore(metricsHistory as never)
    const healthStatus = classifyHealth(healthResult.score)

    await db.company.update({
      where: { id: companyId },
      data: { healthScore: healthResult.score, healthStatus },
    })

    // 7. Write AI summary back to update
    await db.founderUpdate.update({
      where: { id: updateId },
      data: {
        aiSummary: analysis.healthSummary,
        aiProcessedAt: new Date(),
      },
    })

    // 8. Alert if health changed to AT_RISK
    if (healthStatus === 'AT_RISK' && company.healthStatus !== 'AT_RISK') {
      console.log(`[ALERT] ${company.name} health changed to AT_RISK — notify portfolio ops team`)
    }

    return {
      companyId,
      updateId,
      healthScore: healthResult.score,
      healthStatus,
      risksDetected: analysis.risks.length,
      opportunitiesDetected: analysis.opportunities.length,
    }
  },
})
