import { Skeleton } from '@fundos/ui'

export default function IntelligencePage() {
  return (
    <div className="p-6 max-w-3xl">
      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {['All', 'Funding', 'Competitor', 'Market', 'Regulatory'].map((tab, i) => (
          <span
            key={tab}
            className={`px-3 py-1.5 rounded-md text-[12px] font-medium ${i === 0 ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
          >
            {tab}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-80" />
              <Skeleton className="h-3 w-20 flex-shrink-0" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-1.5">
                {Array.from({ length: Math.ceil(Math.random() * 3) + 1 }).map((_, j) => (
                  <Skeleton key={j} className="h-5 w-20 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-[12px] text-muted-foreground/50 pt-6">
        Market Intelligence — Phase 9
      </p>
    </div>
  )
}
