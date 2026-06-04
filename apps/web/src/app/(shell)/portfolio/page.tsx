import { Skeleton } from '@fundos/ui'

export default function PortfolioPage() {
  return (
    <div className="p-6">
      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-8 w-52 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 border-b border-border bg-card">
          {['Company', 'Sector', 'Stage', 'MRR', 'Growth', 'Burn', 'Runway', 'Score', 'Status'].map(
            (col) => (
              <p key={col} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {col}
              </p>
            )
          )}
        </div>
        {/* Rows */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-3 border-b border-border last:border-0 items-center"
          >
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-3.5 w-16 tabular-nums" />
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-10" />
            <Skeleton className="h-3.5 w-8" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
        ))}
      </div>

      <p className="text-center text-[12px] text-muted-foreground/50 pt-6">
        Portfolio Module — Phase 5
      </p>
    </div>
  )
}
