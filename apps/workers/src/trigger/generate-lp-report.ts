import { task } from '@trigger.dev/sdk/v3'
import { db } from '@fundos/database'
import type { Prisma } from '@fundos/database'
import { LPReportingAgent, writeAIAuditLog } from '@fundos/ai'
import { aggregateFundMetrics } from '@fundos/analytics'
import type { CompanyWithMetrics, FounderUpdate, MetricSnapshot } from '@fundos/types'

export interface GenerateLPReportPayload {
  reportId: string
  quarter: string
  companyIds: string[]
  tone: 'STANDARD' | 'CONSERVATIVE' | 'GROWTH_FOCUSED'
}

export const generateLPReport = task({
  id: 'generate-lp-report',
  maxDuration: 300,
  run: async (payload: GenerateLPReportPayload) => {
    const { reportId, quarter, companyIds, tone } = payload

    // 1. Fetch companies with metrics
    const companiesRaw = await db.company.findMany({
      where: { id: { in: companyIds }, status: 'ACTIVE' },
      include: { metrics: { orderBy: { period: 'desc' }, take: 3 } },
    })

    const companies: CompanyWithMetrics[] = companiesRaw.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      logoUrl: c.logoUrl,
      website: c.website,
      sector: c.sector,
      stage: c.stage,
      country: c.country,
      foundedYear: c.foundedYear,
      description: c.description,
      status: c.status,
      healthStatus: c.healthStatus,
      healthScore: c.healthScore,
      latestMetricsId: c.latestMetricsId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      latestMetrics: (c.metrics[0] ?? null) as MetricSnapshot | null,
      metricsHistory: c.metrics as MetricSnapshot[],
    }))

    // 2. Fetch recent updates
    const [year, q] = quarter.split('-Q')
    const quarterStart = new Date(`${year}-${String((parseInt(q ?? '1') - 1) * 3 + 1).padStart(2, '0')}-01`)
    const recentUpdates: FounderUpdate[] = await db.founderUpdate.findMany({
      where: { companyId: { in: companyIds }, createdAt: { gte: quarterStart } },
      orderBy: { createdAt: 'desc' },
    })

    // 3. Compute fund aggregates
    const fundMetrics = aggregateFundMetrics(companies)
    const fundMetricsSnapshot = {
      totalMrr: fundMetrics.totalMrr,
      totalArr: fundMetrics.totalArr,
      totalBurn: fundMetrics.totalBurn,
      avgGrowthMom: fundMetrics.avgGrowthMom,
      avgRunway: fundMetrics.avgRunway,
      totalHeadcount: fundMetrics.totalHeadcount,
      healthDistribution: {
        healthy: fundMetrics.healthDistribution.healthy,
        watchlist: fundMetrics.healthDistribution.watchlist,
        atRisk: fundMetrics.healthDistribution.atRisk,
      },
    } satisfies Prisma.InputJsonObject

    // 4. Run agent
    const startedAt = Date.now()
    const agent = new LPReportingAgent()
    const result = await agent.generate({ quarter, companies, recentUpdates, fundMetrics, tone })
    const duration = Date.now() - startedAt

    await writeAIAuditLog({
      service: 'LPReportingAgent',
      model: 'rule-based-v1',
      promptTokens: 0,    // rule-based agent — no LLM tokens consumed
      completionTokens: 0,
      durationMs: duration,
      entityType: 'LPReport',
      entityId: reportId,
      input: { quarter, companyCount: companyIds.length, tone },
      output: { sectionsGenerated: result.sections.length },
      createdAt: new Date(),
    })

    // 5. Persist sections
    await db.lPReportSection.createMany({
      data: result.sections.map((s) => ({
        reportId,
        title: s.title,
        content: s.content,
        order: s.order,
        aiGenerated: true,
      })),
    })

    // 6. Link companies
    await db.reportCompany.createMany({
      data: companyIds.map((companyId) => ({ reportId, companyId })),
      skipDuplicates: true,
    })

    // 7. Build full markdown + mark READY
    const fullMarkdown = result.sections
      .sort((a, b) => a.order - b.order)
      .map((s) => `# ${s.title}\n\n${s.content}`)
      .join('\n\n---\n\n')

    await db.lPReport.update({
      where: { id: reportId },
      data: {
        status: 'READY',
        markdownContent: fullMarkdown,
        fundMetricsSnapshot,
      },
    })

    return {
      reportId,
      sectionsGenerated: result.sections.length,
      companiesIncluded: companyIds.length,
      durationMs: duration,
    }
  },
})
