'use client'

import { HealthBadge } from '@fundos/ui'
import { formatMrr, formatCurrency, formatRunway, formatRelativeTime, sectorLabel } from '@fundos/shared'
import { cn } from '@/lib/utils'
import type { InboxUpdate } from '@/lib/updates'

interface UpdateCardProps {
  update: InboxUpdate
  isActive?: boolean
  onClick?: () => void
  onMarkReviewed?: () => void
}

export function UpdateCard({ update, isActive, onClick, onMarkReviewed }: UpdateCardProps) {
  const isUnreviewed = !update.reviewedAt

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={cn(
        'rounded-lg border bg-card px-4 py-3.5 cursor-pointer transition-colors select-none',
        'hover:border-border/80 hover:bg-accent/30',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        isActive ? 'border-ring/50 bg-accent/40' : 'border-border',
        isUnreviewed && 'border-l-2 border-l-primary/60'
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-foreground truncate">
              {update.company.name}
            </span>
            <span className="text-[11px] text-muted-foreground">{sectorLabel(update.company.sector)}</span>
            <span className="text-[11px] text-muted-foreground/50">·</span>
            <span className="text-[11px] font-medium text-muted-foreground">{update.period}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {formatRelativeTime(update.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <HealthBadge status={update.company.healthStatus} showDot />
          {isUnreviewed && (
            <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Unreviewed
            </span>
          )}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2.5">
        {[
          { label: 'MRR', value: formatMrr(update.mrr) },
          { label: 'Burn', value: update.burnRate ? formatCurrency(update.burnRate, true) : '—' },
          { label: 'Runway', value: formatRunway(update.runway) },
          { label: 'Headcount', value: update.headcount != null ? String(update.headcount) : '—' },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-[12px] font-medium tabular-nums text-foreground mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* AI summary */}
      {update.aiSummary && (
        <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2 mb-2.5">
          {update.aiSummary}
        </p>
      )}

      {/* Tags row */}
      <div className="flex items-center gap-2 flex-wrap">
        {update.detectedRisks.map((risk, i) => (
          <RiskTag key={i} severity={risk.severity} label={risk.title} />
        ))}
        {update.fundraisingStatus !== 'NOT_RAISING' && (
          <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-400">
            Fundraising
          </span>
        )}

        {/* Mark reviewed button — separate click area */}
        {isUnreviewed && onMarkReviewed && (
          <button
            className="ml-auto text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded hover:bg-accent"
            onClick={(e) => {
              e.stopPropagation()
              onMarkReviewed()
            }}
          >
            Mark reviewed
          </button>
        )}
      </div>
    </div>
  )
}

function RiskTag({ severity, label }: { severity: string; label: string }) {
  const styles: Record<string, string> = {
    CRITICAL: 'bg-red-500/10 border-red-500/20 text-red-400',
    HIGH: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    MEDIUM: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    LOW: 'bg-muted/40 border-border text-muted-foreground',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium', styles[severity] ?? styles.LOW)}>
      {label.length > 24 ? `${label.slice(0, 24)}…` : label}
    </span>
  )
}
