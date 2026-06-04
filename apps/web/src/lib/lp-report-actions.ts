'use server'

import { db } from '@fundos/database'
import { LPReportingAgent } from '@fundos/ai'
import { aggregateFundMetrics } from '@fundos/analytics'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from './auth'

// ── Generate a new LP report ─────────────────────────────────

export interface GenerateReportConfig {
  quarter: string
  companyIds: string[]
  tone: 'STANDARD' | 'CONSERVATIVE' | 'GROWTH_FOCUSED'
  lpProfile?: {
    name: string
    priorities: string[]
    focusSectors: string[]
  }
}

export async function generateReport(
  config: GenerateReportConfig
): Promise<{ success: boolean; reportId: string }> {
  const { quarter, companyIds, tone, lpProfile } = config

  if (!/^\d{4}-Q[1-4]$/.test(quarter)) {
    throw new Error(`Invalid quarter format: ${quarter}`)
  }

  const caller = await getCurrentUser()

  // 1. Create report record in GENERATING state
  const report = await db.lPReport.create({
    data: {
      title: lpProfile?.name ? `${quarter} LP Report — ${lpProfile.name}` : `${quarter} LP Report`,
      quarter,
      status: 'GENERATING',
      generatedById: caller?.id ?? 'SYSTEM',
      // lpProfile added via migration 20260604160000_add_lp_profile
      // JSON.parse(JSON.stringify(...)) ensures Prisma Json compatibility
      ...(lpProfile ? { lpProfile: JSON.parse(JSON.stringify(lpProfile)) as never } : {}),
    },
  })

  try {
    // 2. Fetch companies with full metrics history
    const companiesRaw = await db.company.findMany({
      where: { id: { in: companyIds }, status: 'ACTIVE' },
      include: {
        metrics: {
          orderBy: { period: 'desc' },
          take: 3,
        },
      },
    })

    // Shape into CompanyWithMetrics
    const companies = companiesRaw.map((c) => ({
      ...c,
      latestMetrics: c.metrics[0] ?? null,
      metricsHistory: c.metrics,
    })) as never

    // 3. Fetch recent updates for the quarter
    const [year, q] = quarter.split('-Q')
    const quarterStart = new Date(`${year}-${String((parseInt(q ?? '1') - 1) * 3 + 1).padStart(2, '0')}-01`)
    const recentUpdates = await db.founderUpdate.findMany({
      where: {
        companyId: { in: companyIds },
        createdAt: { gte: quarterStart },
      },
      orderBy: { createdAt: 'desc' },
    }) as never

    // 4. Compute fund aggregates
    const fundMetrics = aggregateFundMetrics(companies)

    // 5. Run LPReportingAgent
    const agent = new LPReportingAgent()
    const generateStart = Date.now()
    const result = await agent.generate({ quarter, companies, recentUpdates, fundMetrics, tone, lpProfile })
    console.info('[AI] lp-reporting generate', {
      quarter,
      tone,
      lpName: lpProfile?.name ?? null,
      companyCount: companyIds.length,
      durationMs: Date.now() - generateStart,
      sectionCount: result.sections.length,
    })

    // 6. Persist sections
    await db.lPReportSection.createMany({
      data: result.sections.map((s) => ({
        reportId: report.id,
        title: s.title,
        content: s.content,
        order: s.order,
        aiGenerated: true,
      })),
    })

    // 7. Link companies
    if (companyIds.length > 0) {
      await db.reportCompany.createMany({
        data: companyIds.map((companyId) => ({ reportId: report.id, companyId })),
        skipDuplicates: true,
      })
    }

    // 8. Build full markdown and mark READY
    const fullMarkdown = result.sections
      .sort((a, b) => a.order - b.order)
      .map((s) => `# ${s.title}\n\n${s.content}`)
      .join('\n\n---\n\n')

    await db.lPReport.update({
      where: { id: report.id },
      data: {
        status: 'READY',
        markdownContent: fullMarkdown,
        fundMetricsSnapshot: fundMetrics as never,
      },
    })

    revalidatePath('/lp-reports')
    return { success: true, reportId: report.id }
  } catch (err) {
    await db.lPReport.update({
      where: { id: report.id },
      data: { status: 'FAILED' },
    })
    throw err
  }
}

// ── Edit a section inline ────────────────────────────────────

export async function updateReportSection(
  sectionId: string,
  content: string,
  reportId: string
): Promise<{ success: boolean }> {
  await db.lPReportSection.update({
    where: { id: sectionId },
    data: { content, aiGenerated: false, editedAt: new Date() },
  })

  // Rebuild full markdown from all sections
  const sections = await db.lPReportSection.findMany({
    where: { reportId },
    orderBy: { order: 'asc' },
  })
  const fullMarkdown = sections
    .map((s) => `# ${s.title}\n\n${s.content}`)
    .join('\n\n---\n\n')

  await db.lPReport.update({
    where: { id: reportId },
    data: { markdownContent: fullMarkdown },
  })

  revalidatePath(`/lp-reports/${reportId}`)
  return { success: true }
}

// ── Mark report as exported ──────────────────────────────────

export async function markReportExported(id: string): Promise<{ success: boolean }> {
  await db.lPReport.update({
    where: { id },
    data: { status: 'EXPORTED' },
  })
  revalidatePath('/lp-reports')
  return { success: true }
}
