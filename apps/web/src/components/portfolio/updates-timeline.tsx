import { FileText, CheckCircle } from 'lucide-react'
import { formatPeriod, formatRelativeTime, formatMrr, formatRunway } from '@fundos/shared'
import type { CompanyDetail } from '@/lib/portfolio'

type Update = NonNullable<CompanyDetail['updates']>[number]

const FUNDRAISING_LABELS: Record<string, string> = {
  NOT_RAISING: '',
  EXPLORING: 'Exploring raise',
  ACTIVELY_RAISING: 'Actively raising',
  TERM_SHEET: 'Term sheet',
  CLOSED: 'Round closed',
}

function UpdateCard({ update }: { update: Update }) {
  const fundLabel = FUNDRAISING_LABELS[update.fundraisingStatus] ?? ''

  return (
    <div className="relative pl-6">
      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-border bg-card" />
      {/* Connector line handled via border-left on parent */}

      <div className="pb-5 last:pb-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-[13px] font-medium">{formatPeriod(update.period)}</span>
          {update.mrr != null && (
            <span className="text-[12px] text-muted-foreground tabular-nums">{formatMrr(update.mrr)} MRR</span>
          )}
          {update.runway != null && (
            <span className="text-[12px] text-muted-foreground tabular-nums">· {formatRunway(update.runway)} runway</span>
          )}
          {fundLabel && (
            <span className="text-[10px] font-medium text-primary bg-primary/10 rounded px-1.5 py-px">
              {fundLabel}
            </span>
          )}
          {update.reviewedAt ? (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CheckCircle size={10} className="text-emerald-400" />
              Reviewed
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded px-1.5 py-px">
              New
            </span>
          )}
          <span className="text-[11px] text-muted-foreground ml-auto">{formatRelativeTime(update.createdAt)}</span>
        </div>

        {update.aiSummary ? (
          <p className="text-[13px] text-foreground/90 leading-relaxed">{update.aiSummary}</p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide">Wins</p>
            <p className="text-[13px] text-foreground/80 leading-relaxed line-clamp-3">{update.wins}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function UpdatesTimeline({ updates }: { updates: Update[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-muted-foreground" />
          <p className="text-[13px] font-medium">Founder Updates</p>
        </div>
        <span className="text-[12px] text-muted-foreground tabular-nums">{updates.length} updates</span>
      </div>

      {updates.length === 0 ? (
        <p className="text-[13px] text-muted-foreground text-center py-4">No updates submitted yet.</p>
      ) : (
        <div className="border-l border-border ml-[5px] pl-0">
          {updates.map((u) => (
            <UpdateCard key={u.id} update={u} />
          ))}
        </div>
      )}
    </div>
  )
}
