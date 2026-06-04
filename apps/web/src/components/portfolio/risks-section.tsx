import { ShieldAlert, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompanyDetail } from '@/lib/portfolio'

type Risk = NonNullable<CompanyDetail['risks']>[number]

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'border-red-500/30 bg-red-500/5',
  HIGH: 'border-orange-500/25 bg-orange-500/5',
  MEDIUM: 'border-amber-500/20 bg-amber-500/5',
  LOW: 'border-border bg-secondary/30',
}

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: 'bg-red-500/15 text-red-400',
  HIGH: 'bg-orange-500/15 text-orange-400',
  MEDIUM: 'bg-amber-500/15 text-amber-400',
  LOW: 'bg-zinc-500/15 text-zinc-400',
}

const CATEGORY_ICON: Record<string, string> = {
  BURN: '🔥',
  REVENUE: '📉',
  TEAM: '👥',
  PRODUCT: '🔧',
  MARKET: '📊',
  FUNDRAISING: '💰',
  OPERATIONAL: '⚙️',
  LEGAL: '⚖️',
  OTHER: '•',
}

function RiskCard({ risk }: { risk: Risk }) {
  const isResolved = risk.status === 'RESOLVED'
  return (
    <div
      className={cn(
        'rounded-lg border p-3.5 space-y-1.5',
        isResolved ? 'border-border bg-secondary/20 opacity-60' : SEVERITY_STYLES[risk.severity] ?? 'border-border'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="text-base leading-none mt-px flex-shrink-0">
            {CATEGORY_ICON[risk.category] ?? '•'}
          </span>
          <p className="text-[13px] font-medium text-foreground leading-snug">{risk.title}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isResolved ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 rounded px-1.5 py-px">
              <CheckCircle2 size={10} />
              Resolved
            </span>
          ) : (
            <span className={cn('text-[10px] font-semibold rounded px-1.5 py-px', SEVERITY_LABEL[risk.severity])}>
              {risk.severity}
            </span>
          )}
        </div>
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-3">
        {risk.description}
      </p>
      {risk.source && (
        <p className="text-[11px] text-muted-foreground/50 italic">{risk.source}</p>
      )}
    </div>
  )
}

export function RisksSection({ risks }: { risks: Risk[] }) {
  const open = risks.filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS')
  const resolved = risks.filter((r) => r.status === 'RESOLVED')

  if (risks.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={14} className="text-muted-foreground" />
          <p className="text-[13px] font-medium">Risks</p>
        </div>
        <p className="text-[13px] text-muted-foreground text-center py-4">No risks recorded.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className={open.length > 0 ? 'text-amber-400' : 'text-muted-foreground'} />
          <p className="text-[13px] font-medium">Risks</p>
        </div>
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {open.length} open{resolved.length > 0 ? ` · ${resolved.length} resolved` : ''}
        </span>
      </div>

      <div className="space-y-2">
        {open.map((r) => <RiskCard key={r.id} risk={r} />)}
        {resolved.map((r) => <RiskCard key={r.id} risk={r} />)}
      </div>
    </div>
  )
}
