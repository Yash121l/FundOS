import { task, schedules } from '@trigger.dev/sdk/v3'
import { db } from '@fundos/database'
import { MarketIntelligenceAgent } from '@fundos/ai'
import type { Company } from '@fundos/types'

// ── NewsAPI response shapes ───────────────────────────────────

interface NewsArticle {
  title: string
  description: string | null
  url: string
  source: { name: string }
  publishedAt: string
}

interface NewsApiResponse {
  status: string
  articles?: NewsArticle[]
}

// ── Category classification ───────────────────────────────────
//
// Keyword rules ordered most-specific → most-general. ACQUISITION and IPO are
// checked first because their terminology rarely overlaps with FUNDING_NEWS.

type SignalCategory = 'FUNDING_NEWS' | 'COMPETITOR_ACTIVITY' | 'MARKET_TREND' | 'REGULATION' | 'ACQUISITION' | 'IPO' | 'OTHER'

function classifyArticle(title: string, description: string): SignalCategory {
  const text = (title + ' ' + description).toLowerCase()
  if (/\bacquir(?:ed?|ition|es)\b|\bbought by\b|\bmerger\b/.test(text)) return 'ACQUISITION'
  if (/\bipo\b|\bpublic offering\b|\blisted on\b|\bstock market debut\b/.test(text)) return 'IPO'
  if (/\bregulat(?:ion|ory|or)\b|\bcompliance\b|\bloc\b|\blaw\b|\bfine\b|\bsec\b|\bpenalt\b/.test(text)) return 'REGULATION'
  if (/\bfundraise?\b|\bseries [a-e]\b|\bseed round\b|\binvestment round\b|\braised \$/.test(text)) return 'FUNDING_NEWS'
  if (/\bcompetitor\b|\brival\b|\blaunch(?:ed|es)?\b|\bnew product\b|\bbeats\b|\boutpaces\b/.test(text)) return 'COMPETITOR_ACTIVITY'
  if (/\bmarket trend\b|\banalysis\b|\breport\b|\bindustry\b|\bforecast\b|\boutlook\b/.test(text)) return 'MARKET_TREND'
  return 'OTHER'
}

// ── Live signal fetch from NewsAPI ────────────────────────────

async function fetchLiveSignals(): Promise<NewsArticle[]> {
  const key = process.env.NEWS_API_KEY
  // When the key is absent the job still runs — it skips ingestion and only
  // enriches existing seeded signals with company relevance links.
  if (!key) return []

  // Four curated queries covering the VC signal categories we care about.
  // pageSize=10 per query keeps us well within the free plan's 100 req/day.
  const queries = [
    'startup funding round venture capital',
    'SaaS fintech AI acquisition',
    'tech regulation compliance',
    'startup IPO public offering',
  ]

  const articles: NewsArticle[] = []
  // Deduplicate by URL across queries — the same article can appear in multiple searches.
  const seen = new Set<string>()

  for (const q of queries) {
    try {
      const url = new URL('https://newsapi.org/v2/everything')
      url.searchParams.set('q', q)
      url.searchParams.set('language', 'en')
      url.searchParams.set('sortBy', 'publishedAt')
      url.searchParams.set('pageSize', '10')
      // Only pull articles from the last 24 hours — this job runs daily.
      url.searchParams.set('from', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '')

      const res = await fetch(url.toString(), {
        headers: { 'X-Api-Key': key },
        // Hard timeout per query — a stalled NewsAPI response must not block the whole job.
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) continue

      const data = (await res.json()) as NewsApiResponse
      for (const a of data.articles ?? []) {
        if (!a.title || !a.url || seen.has(a.url)) continue
        seen.add(a.url)
        articles.push(a)
      }
    } catch (err) {
      // Log and continue — a single query failure should not abort the others.
      console.error('[ingest-market-signals] NewsAPI query failed', { q, err })
    }
  }

  return articles
}

// ── Main task ─────────────────────────────────────────────────

export const ingestMarketSignals = task({
  id: 'ingest-market-signals',
  maxDuration: 300,
  run: async (_payload: { triggeredBy?: 'schedule' | 'manual' } = {}) => {
    const companies = await db.company.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, slug: true, sector: true, description: true, status: true },
    })

    const agent = new MarketIntelligenceAgent()
    let ingested = 0
    let enriched = 0
    let failed = 0

    // ── Phase 1: Store new live articles ──────────────────────
    // Deduplication happens by URL at the DB level — we check before inserting
    // so re-running the job on the same day is safe (idempotent).
    const liveArticles = await fetchLiveSignals()

    for (const article of liveArticles) {
      try {
        const title = article.title.slice(0, 250)
        const summary = (article.description ?? article.title).slice(0, 1000)
        const category = classifyArticle(title, summary)

        const exists = await db.marketSignal.findFirst({
          where: { url: article.url },
          select: { id: true },
        })
        if (exists) continue

        await db.marketSignal.create({
          data: {
            title,
            summary,
            url: article.url,
            source: article.source.name || 'NewsAPI',
            category,
            publishedAt: new Date(article.publishedAt),
            // Default relevance = 0.5 (neutral); updated in Phase 2 based on portfolio matches.
            relevance: 0.5,
          },
        })
        ingested++
      } catch (err) {
        console.error('[ingest-market-signals] signal create failed', { url: article.url, err })
      }
    }

    // ── Phase 2: Link signals to portfolio companies ──────────
    // Cap at 30 to stay within Trigger.dev's 300s maxDuration even when
    // many signals have accumulated without being enriched.
    const unlinked = await db.marketSignal.findMany({
      where: { companies: { none: {} } },
      orderBy: { publishedAt: 'desc' },
      take: 30,
    })

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

          // Bump relevance score proportional to the number of portfolio matches.
          await db.marketSignal.update({
            where: { id: signal.id },
            data: { relevance: Math.min(0.5 + result.relevantCompanyIds.length * 0.1, 1.0) },
          })

          enriched++
        }
      } catch (err) {
        // Per-signal failures are non-fatal — log and move to the next one.
        console.error('[ingest-market-signals] enrichment failed', { signalId: signal.id, err })
        failed++
      }
    }

    console.log('[ingest-market-signals] done', { ingested, enriched, failed })
    return { ingested, enrichedLinks: enriched, failed }
  },
})

// Run daily at 6am UTC — after most of the world's business day has begun.
export const signalIngestionSchedule = schedules.task({
  id: 'signal-ingestion-daily',
  cron: '0 6 * * *',
  run: async () => ingestMarketSignals.triggerAndWait({}),
})
