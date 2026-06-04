import { Globe } from 'lucide-react'
import { formatRelativeTime } from '@fundos/shared'
import { cn } from '@/lib/utils'
import type { SignalItem } from '@/lib/portfolio'

const CAT_STYLES: Record<string, string> = {
  FUNDING_NEWS: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  COMPETITOR_ACTIVITY: 'bg-red-500/10 text-red-400 border-red-500/20',
  MARKET_TREND: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  REGULATION: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ACQUISITION: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  IPO: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  OTHER: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

const CAT_LABELS: Record<string, string> = {
  FUNDING_NEWS: 'Funding',
  COMPETITOR_ACTIVITY: 'Competitor',
  MARKET_TREND: 'Market',
  REGULATION: 'Regulatory',
  ACQUISITION: 'Acquisition',
  IPO: 'IPO',
  OTHER: 'Signal',
}

export function SignalsSection({ signals }: { signals: SignalItem[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe size={14} className="text-muted-foreground" />
        <p className="text-[13px] font-medium">Market Signals</p>
        <span className="text-[11px] text-muted-foreground tabular-nums ml-auto">
          {signals.length}
        </span>
      </div>

      {signals.length === 0 ? (
        <p className="text-[13px] text-muted-foreground text-center py-4">No signals linked yet.</p>
      ) : (
        <div className="space-y-2.5">
          {signals.map((s) => (
            <div key={s.id} className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] text-foreground leading-snug flex-1">{s.title}</p>
                <span
                  className={cn(
                    'flex-shrink-0 text-[10px] font-medium border rounded px-1.5 py-px',
                    CAT_STYLES[s.category] ?? CAT_STYLES.OTHER
                  )}
                >
                  {CAT_LABELS[s.category] ?? s.category}
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground line-clamp-2">{s.summary}</p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                <span>{s.source}</span>
                <span>·</span>
                <span>{formatRelativeTime(s.publishedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
