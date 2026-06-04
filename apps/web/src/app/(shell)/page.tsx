import { Skeleton } from '@fundos/ui'

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Healthy', value: '20', color: 'text-emerald-400' },
          { label: 'Watchlist', value: '7', color: 'text-amber-400' },
          { label: 'At Risk', value: '3', color: 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              {s.label}
            </p>
            <p className={`text-2xl font-semibold tabular-nums mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Fund metrics — skeletons until Phase 4 */}
      <div className="grid grid-cols-4 gap-3">
        {['Total ARR', 'Avg Growth', 'Total Burn', 'Avg Runway'].map((label) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-3.5 space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Recent updates */}
        <div className="col-span-2 rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-[13px] font-medium">Recent Updates</p>
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <Skeleton className="h-7 w-7 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-14 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Trends */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[13px] font-medium">Active Trends</p>
          </div>
          <div className="p-3 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-md border border-border p-3 space-y-1.5">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-[12px] text-muted-foreground/50 pt-2">
        Executive Dashboard — Phase 4
      </p>
    </div>
  )
}
