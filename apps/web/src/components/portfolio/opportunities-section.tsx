import { Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompanyDetail } from '@/lib/portfolio'

type Opportunity = CompanyDetail['opportunities'][number]

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  ACTED_ON: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  DISMISSED: 'bg-secondary/30 border-border text-muted-foreground',
}

const CATEGORY_ICON: Record<string, string> = {
  FUNDRAISING: '💰',
  GROWTH: '📈',
  REVENUE: '💵',
  OPERATIONAL: '⚙️',
  HIRING: '👥',
  MARKET: '🌍',
}

export function OpportunitiesSection({ opportunities }: { opportunities: Opportunity[] }) {
  const open = opportunities.filter((o) => o.status === 'OPEN')
  const actedOn = opportunities.filter((o) => o.status === 'ACTED_ON')

  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={14} className="text-muted-foreground" />
          <p className="text-[13px] font-medium">Opportunities</p>
        </div>
        <p className="text-[13px] text-muted-foreground text-center py-4">No opportunities identified yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-emerald-400" />
          <p className="text-[13px] font-medium">Opportunities</p>
        </div>
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {open.length} open{actedOn.length > 0 ? ` · ${actedOn.length} acted on` : ''}
        </span>
      </div>

      <div className="space-y-2">
        {[...open, ...actedOn].map((o) => (
          <div key={o.id} className="rounded-lg border border-border bg-secondary/20 p-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm flex-shrink-0">{CATEGORY_ICON[o.category] ?? '✨'}</span>
                <p className="text-[13px] font-medium text-foreground truncate">{o.title}</p>
              </div>
              <span className={cn('text-[10px] font-semibold rounded-md border px-1.5 py-0.5 flex-shrink-0', STATUS_STYLES[o.status] ?? STATUS_STYLES.OPEN)}>
                {o.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">{o.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
