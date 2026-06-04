import { Skeleton } from '@fundos/ui'

export default function LPReportsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border bg-card">
          {['Report', 'Quarter', 'Companies', 'Status', ''].map((col) => (
            <p key={col} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {col}
            </p>
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3.5 border-b border-border last:border-0 items-center">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-8" />
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        ))}
      </div>

      <p className="text-center text-[12px] text-muted-foreground/50 pt-6">
        LP Reporting — Phase 8
      </p>
    </div>
  )
}
