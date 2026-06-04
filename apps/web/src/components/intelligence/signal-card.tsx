import Link from 'next/link'
import { formatRelativeTime } from '@fundos/shared'
import { cn } from '@/lib/utils'
import type { SignalItem } from '@/lib/signals'

interface SignalCardProps {
  signal: SignalItem
  isRead: boolean
  onMarkRead: (id: string) => void
}

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
  OTHER: 'Other',
}

export function SignalCard({ signal, isRead, onMarkRead }: SignalCardProps) {
  return (
    <div className={cn(
      'rounded-lg border bg-card p-4 transition-colors',
      isRead ? 'border-border opacity-60' : 'border-border hover:border-border/80',
      !isRead && 'border-l-2 border-l-primary/50'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn(
              'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold flex-shrink-0',
              CAT_STYLES[signal.category] ?? CAT_STYLES.OTHER
            )}>
              {CAT_LABELS[signal.category] ?? signal.category}
            </span>
            <span className="text-[11px] text-muted-foreground">{signal.source}</span>
            <span className="text-[11px] text-muted-foreground/50">·</span>
            <span className="text-[11px] text-muted-foreground">{formatRelativeTime(signal.publishedAt)}</span>
          </div>
          {signal.url ? (
            <a
              href={signal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-semibold text-foreground hover:underline leading-snug"
            >
              {signal.title}
            </a>
          ) : (
            <p className="text-[13px] font-semibold text-foreground leading-snug">{signal.title}</p>
          )}
        </div>
        {!isRead && (
          <button
            onClick={() => onMarkRead(signal.id)}
            className="flex-shrink-0 h-6 px-2 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Mark read
          </button>
        )}
      </div>

      {/* Summary */}
      <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">{signal.summary}</p>

      {/* Related companies */}
      {signal.companies.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground/60 font-medium mr-0.5">Portfolio:</span>
          {signal.companies.map((cs) => (
            <Link
              key={cs.company.id}
              href={`/portfolio/${cs.company.slug}`}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/30 px-2.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
            >
              <span className={cn(
                'h-1.5 w-1.5 rounded-full flex-shrink-0',
                cs.company.healthStatus === 'HEALTHY' ? 'bg-emerald-400' :
                cs.company.healthStatus === 'AT_RISK' ? 'bg-red-400' : 'bg-amber-400'
              )} />
              {cs.company.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
