import Link from 'next/link'
import { ArrowRight, TrendingUp } from 'lucide-react'
import type { ActiveTrend } from '@/lib/dashboard'
import { cn } from '@/lib/utils'

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
  HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  LOW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

const CATEGORY_LABEL: Record<string, string> = {
  SHARED_RISK: 'Shared Risk',
  HIRING_PATTERN: 'Hiring',
  FUNDRAISING: 'Fundraising',
  GROWTH_PATTERN: 'Growth',
  MARKET_EVENT: 'Market',
  OPERATIONAL: 'Operational',
}

export function TrendsSummaryPanel({ trends }: { trends: ActiveTrend[] }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <TrendingUp size={13} className="text-primary" />
          <span className="text-[13px] font-medium">Active Trends</span>
        </div>
        <Link
          href="/trends"
          className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight size={11} />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {trends.map((t) => (
          <Link
            key={t.id}
            href="/trends"
            className="flex flex-col gap-2 px-4 py-3 hover:bg-secondary/40 transition-colors group"
          >
            <div className="flex items-start gap-2">
              <p className="text-[13px] text-foreground font-medium flex-1 leading-snug">{t.title}</p>
              <span
                className={cn(
                  'flex-shrink-0 text-[10px] font-semibold border rounded px-1.5 py-px',
                  SEVERITY_STYLES[t.severity] ?? SEVERITY_STYLES.MEDIUM
                )}
              >
                {t.severity}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {t.evidence.slice(0, 3).map(({ company }, i) => (
                  <span
                    key={i}
                    className="text-[11px] text-muted-foreground bg-secondary rounded px-1.5 py-px"
                  >
                    {(company.name.trim() || '?').split(' ')[0]}
                  </span>
                ))}
                {t.affectedCount > 3 && (
                  <span className="text-[11px] text-muted-foreground">+{t.affectedCount - 3}</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground/60 border border-border rounded px-1.5 py-px">
                {CATEGORY_LABEL[t.category] ?? t.category}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
