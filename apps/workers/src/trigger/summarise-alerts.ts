import { schedules } from '@trigger.dev/sdk/v3'
import { db } from '@fundos/database'
import { AlertSummariserAgent } from '@fundos/ai'

// Returns the Monday 00:00 UTC of the current week — stable anchor for idempotency
function getWeekStart(): Date {
  const now = new Date()
  const daysFromMonday = now.getUTCDay() === 0 ? 6 : now.getUTCDay() - 1
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysFromMonday
  ))
}

export const summariseAlertsJob = schedules.task({
  id: 'summarise-alerts',
  cron: '0 7 * * 1', // Every Monday at 7am UTC (start of work week)
  run: async () => {
    const weekStart = getWeekStart()

    // Idempotency: skip if a digest already exists for this calendar week
    const existing = await db.auditLog.findFirst({
      where: {
        action: 'WEEKLY_ALERT_DIGEST',
        entityType: 'PORTFOLIO',
        createdAt: { gte: weekStart },
      },
    })
    if (existing) {
      console.log('[summarise-alerts] Digest already exists for this week — skipping')
      return { skipped: true }
    }

    // Hard cap at 500 risks — avoids OOM while covering any realistic portfolio
    const risks = await db.risk.findMany({
      where: {
        severity: { in: ['HIGH', 'CRITICAL'] },
        status: 'OPEN',
        createdAt: { gte: weekStart },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 500,
      select: {
        title: true,
        severity: true,
        category: true,
        createdAt: true,
        company: { select: { name: true } },
      },
    })

    if (risks.length === 0) {
      console.log('[summarise-alerts] No high-severity risks this week — skipping digest')
      return { alertCount: 0 }
    }

    const weekOf = weekStart.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    let digest
    try {
      const agent = new AlertSummariserAgent()
      digest = await agent.summarise({
        weekOf,
        risks: risks.map((r) => ({
          title: r.title,
          severity: r.severity,
          category: r.category,
          createdAt: r.createdAt,
          companyName: r.company.name,
        })),
      })
    } catch (err) {
      console.error('[summarise-alerts] Agent failed', {
        weekOf,
        riskCount: risks.length,
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    }

    // Serialize to ensure Dates → ISO strings before storing as JSON.
    // JSON.parse returns any which satisfies Prisma's InputJsonValue.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const metadata = JSON.parse(JSON.stringify(digest))

    await db.auditLog.create({
      data: {
        userId: null,
        action: 'WEEKLY_ALERT_DIGEST',
        entityType: 'PORTFOLIO',
        entityId: 'global',
        metadata,
      },
    })

    console.log(`[summarise-alerts] Digest created: ${digest.totalAlerts} alerts, ${digest.groups.length} groups`)
    return { alertCount: digest.totalAlerts, groups: digest.groups.length }
  },
})
