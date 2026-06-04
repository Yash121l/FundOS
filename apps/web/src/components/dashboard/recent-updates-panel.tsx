import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { HealthBadge } from '@fundos/ui'
import { formatRelativeTime, formatPeriod } from '@fundos/shared'
import type { RecentUpdate } from '@/lib/dashboard'
import { cn } from '@/lib/utils'

const SECTOR_COLORS: Record<string, string> = {
  SAAS: 'bg-blue-500/20 text-blue-400',
  AI: 'bg-purple-500/20 text-purple-400',
  FINTECH: 'bg-violet-500/20 text-violet-400',
  DEVTOOLS: 'bg-cyan-500/20 text-cyan-400',
  CLIMATETECH: 'bg-green-500/20 text-green-400',
  OTHER: 'bg-zinc-500/20 text-zinc-400',
}

export function RecentUpdatesPanel({ updates }: { updates: RecentUpdate[] }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-[13px] font-medium">Recent Updates</span>
        <Link
          href="/updates"
          className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight size={11} />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {updates.map((u) => (
          <Link
            key={u.id}
            href={`/portfolio/${u.company.slug}`}
            className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors group"
          >
            {/* Company avatar */}
            <div
              className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center text-[12px] font-semibold flex-shrink-0 mt-px',
                SECTOR_COLORS[u.company.sector] ?? SECTOR_COLORS.OTHER
              )}
            >
              {u.company.name.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-medium text-foreground">{u.company.name}</span>
                <span className="text-[11px] text-muted-foreground">{formatPeriod(u.period)}</span>
                <HealthBadge
                  status={u.company.healthStatus as 'HEALTHY' | 'WATCHLIST' | 'AT_RISK'}
                  showDot={false}
                />
                {!u.reviewedAt && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded px-1.5 py-px">
                    New
                  </span>
                )}
              </div>
              {u.aiSummary ? (
                <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-2">{u.aiSummary}</p>
              ) : (
                <p className="mt-0.5 text-[12px] text-muted-foreground italic">Update submitted — AI summary processing</p>
              )}
            </div>

            <div className="flex-shrink-0 flex items-center gap-2 mt-px">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {formatRelativeTime(u.createdAt)}
              </span>
              <ArrowRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
