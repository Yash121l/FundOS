import { Skeleton } from '@fundos/ui'

export default function UpdatesPage() {
  return (
    <div className="p-6 max-w-3xl">
      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-md flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24 mt-1" />
              </div>
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {['MRR', 'Growth', 'Burn', 'Runway'].map((m) => (
                <div key={m}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m}</p>
                  <Skeleton className="h-4 w-14 mt-1" />
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-full rounded" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-[12px] text-muted-foreground/50 pt-6">
        Founder Updates Inbox — Phase 6
      </p>
    </div>
  )
}
