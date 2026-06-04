import Link from 'next/link'
import { Bell } from 'lucide-react'
import { formatRelativeTime } from '@fundos/shared'
import { cn } from '@/lib/utils'
import type { RecentAlert } from '@/lib/dashboard'

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
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

export function RecentAlertsPanel({ alerts }: { alerts: RecentAlert[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell size={14} className={alerts.length > 0 ? 'text-orange-400' : 'text-muted-foreground'} />
          <p className="text-[13px] font-semibold">Recent Alerts</p>
        </div>
        {alerts.length > 0 && (
          <span className="inline-flex items-center rounded-md bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400 tabular-nums">
            {alerts.length}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <p className="text-[13px] text-muted-foreground text-center py-4">No alerts in the last 14 days.</p>
      ) : (
        <div className="space-y-1.5">
          {alerts.map((alert) => (
            <Link
              key={alert.id}
              href={`/portfolio/${alert.company.slug}`}
              className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/40 transition-colors group"
            >
              <span className="text-sm flex-shrink-0 mt-px">{CATEGORY_ICON[alert.category] ?? '•'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[12px] font-semibold text-foreground group-hover:underline truncate">
                    {alert.company.name}
                  </span>
                  <span className={cn(
                    'inline-flex items-center rounded border px-1.5 py-px text-[9px] font-bold tracking-wide flex-shrink-0',
                    SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.HIGH
                  )}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-1">{alert.title}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">{formatRelativeTime(alert.createdAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
