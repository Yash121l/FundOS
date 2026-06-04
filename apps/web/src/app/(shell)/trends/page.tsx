import { getTrendsForPage, getTrendCounts, type TrendFilter } from '@/lib/trends'
import { TrendsList } from '@/components/trends/trends-list'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ category?: string }>
}

export default async function TrendsPage({ searchParams }: Props) {
  const params = await searchParams
  const filter = (params.category?.toUpperCase() as TrendFilter | undefined) ?? 'ALL'

  const [trends, counts] = await Promise.all([
    getTrendsForPage(filter).catch(() => []),
    getTrendCounts().catch(() => ({ active: 0, dismissed: 0 })),
  ])

  return (
    <div className="p-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[15px] font-semibold text-foreground">Trend Detection</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Cross-portfolio patterns from founder updates
          </p>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-semibold tabular-nums text-foreground leading-none">{counts.active}</p>
          <p className="text-[11px] text-muted-foreground">active trend{counts.active !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <TrendsList initialTrends={trends} initialFilter={filter} />
    </div>
  )
}
