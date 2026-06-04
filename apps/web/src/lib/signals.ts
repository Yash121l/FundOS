import { db } from '@fundos/database'
import type { SignalCategory } from '@fundos/types'

export type SignalFilter = 'ALL' | Exclude<SignalCategory, 'OTHER'>

export async function getSignals(filter: SignalFilter = 'ALL') {
  const where = filter === 'ALL' ? {} : { category: filter as SignalCategory }

  return db.marketSignal.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      title: true,
      summary: true,
      source: true,
      category: true,
      publishedAt: true,
      url: true,
      relevance: true,
      companies: {
        select: {
          relevanceExplanation: true,
          company: {
            select: { id: true, name: true, slug: true, healthStatus: true, sector: true },
          },
        },
        take: 4,
      },
    },
  })
}

export type SignalItem = Awaited<ReturnType<typeof getSignals>>[number]

export async function getSignalCounts() {
  const rows = await db.marketSignal.groupBy({
    by: ['category'],
    _count: { id: true },
  })
  const map: Record<string, number> = {}
  for (const r of rows) map[r.category] = r._count.id
  const total = Object.values(map).reduce((s, v) => s + v, 0)
  return { total, ...map }
}
