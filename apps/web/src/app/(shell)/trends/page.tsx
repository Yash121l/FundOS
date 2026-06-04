import { Skeleton } from '@fundos/ui'

export default function TrendsPage() {
  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="grid grid-cols-2 gap-3 mb-2">
        {['All', 'Shared Risk', 'Hiring', 'Fundraising', 'Growth'].map((f) => (
          <span key={f} className="hidden" />
        ))}
        <Skeleton className="h-8 w-full col-span-1 rounded-lg" />
        <Skeleton className="h-8 w-full col-span-1 rounded-lg" />
      </div>

      {[4, 3, 3, 4, 3].map((companies, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-3.5 w-full max-w-lg" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex-shrink-0 space-y-1.5 text-right">
              <Skeleton className="h-5 w-20 rounded-md" />
              <p className="text-[11px] text-muted-foreground">{companies} companies</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: companies }).map((_, j) => (
              <Skeleton key={j} className="h-5 w-20 rounded-full" />
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-7 w-28 rounded-md" />
          </div>
        </div>
      ))}

      <p className="text-center text-[12px] text-muted-foreground/50 pt-2">
        Trend Detection — Phase 7
      </p>
    </div>
  )
}
