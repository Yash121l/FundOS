import { task, schedules } from '@trigger.dev/sdk/v3'
import { db } from '@fundos/database'
import { MarketIntelligenceAgent } from '@fundos/ai'
import type { Company } from '@fundos/types'

// Stub — mock data only in MVP.
// Architecture is ready for Exa/Tavily/Firecrawl integration.
export const ingestMarketSignals = task({
  id: 'ingest-market-signals',
  maxDuration: 300,
  run: async (_payload: { triggeredBy?: 'schedule' | 'manual' } = {}) => {
    // In production this would:
    // 1. Fetch signals from Exa/Tavily/Firecrawl
    // 2. Deduplicate by title/url
    // 3. Run MarketIntelligenceAgent.enrich() per signal
    // 4. Upsert MarketSignal + CompanySignal records

    const companies = await db.company.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, slug: true, sector: true, description: true, status: true },
    })

    const agent = new MarketIntelligenceAgent()

    // Example: process any signals without company links yet
    const unlinked = await db.marketSignal.findMany({
      where: { companies: { none: {} } },
      take: 20,
    })

    let enriched = 0
    let failed = 0
    for (const signal of unlinked) {
      try {
        const result = await agent.enrich({
          signal,
          portfolio: companies as unknown as Pick<Company, 'id' | 'name' | 'sector' | 'description' | 'status'>[],
        })
        if (result.relevantCompanyIds.length > 0) {
          await db.companySignal.createMany({
            data: result.relevantCompanyIds.map((companyId) => ({
              signalId: signal.id,
              companyId,
              relevanceExplanation: result.perCompanyReasons[companyId] ?? result.relevanceExplanation,
            })),
            skipDuplicates: true,
          })
          enriched++
        }
      } catch (err) {
        console.error('[ingest-market-signals] enrichment failed', { signalId: signal.id, err })
        failed++
      }
    }

    return { processed: unlinked.length, enriched, failed }
  },
})

// Daily refresh at 6am UTC
export const signalIngestionSchedule = schedules.task({
  id: 'signal-ingestion-daily',
  cron: '0 6 * * *',
  run: async () => ingestMarketSignals.triggerAndWait({}),
})
