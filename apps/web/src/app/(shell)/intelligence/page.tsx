import { getSignals, getSignalCounts, type SignalFilter } from '@/lib/signals'
import { SignalFeed } from '@/components/intelligence/signal-feed'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ category?: string }>
}

export default async function IntelligencePage({ searchParams }: Props) {
  const params = await searchParams
  const filter = (params.category?.toUpperCase() as SignalFilter | undefined) ?? 'ALL'

  const [signals, counts] = await Promise.all([
    getSignals(filter).catch(() => []),
    getSignalCounts().catch(() => ({ total: 0 })),
  ])

  return (
    <div className="p-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[15px] font-semibold text-foreground">Market Intelligence</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Funding news, competitor activity, and market signals relevant to your portfolio
          </p>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-semibold tabular-nums text-foreground leading-none">{counts.total ?? 0}</p>
          <p className="text-[11px] text-muted-foreground">signal{(counts.total ?? 0) !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <SignalFeed initialSignals={signals} initialFilter={filter} counts={counts} />
    </div>
  )
}
