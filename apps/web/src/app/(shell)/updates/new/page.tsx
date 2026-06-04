import { Skeleton } from '@fundos/ui'

export default function NewUpdatePage() {
  return (
    <div className="p-6 max-w-xl">
      <div className="space-y-4">
        <div className="flex gap-1 mb-6">
          {['Metrics', 'Narrative', 'Review'].map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-medium ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {i + 1}
              </div>
              <span className={`text-[12px] ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{step}</span>
              {i < 2 && <span className="mx-2 text-muted-foreground/30">›</span>}
            </div>
          ))}
        </div>
        {['Revenue (MRR)', 'Monthly Burn', 'Cash Balance', 'Headcount'].map((label) => (
          <div key={label}>
            <p className="text-[12px] font-medium text-muted-foreground mb-1.5">{label}</p>
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ))}
        <div className="pt-2 flex justify-end gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <p className="text-center text-[12px] text-muted-foreground/50 pt-8">
        Update Submission — Phase 6
      </p>
    </div>
  )
}
