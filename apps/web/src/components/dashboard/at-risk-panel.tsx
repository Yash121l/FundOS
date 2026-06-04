import Link from 'next/link'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import { HealthBadge } from '@fundos/ui'
import { formatPercent } from '@fundos/shared'
import { cn } from '@/lib/utils'

type Company = {
  id: string
  name: string
  slug: string
  sector: string
  healthStatus: string
  healthScore: number
  latestMetrics: {
    mrr: number | null
    revenueGrowthMom: number | null
    runway: number | null
    burnRate: number | null
  } | null
  topRisk: { title: string; severity: string } | null
}

function keyMetric(c: Company): string {
  const m = c.latestMetrics
  if (!m) return '—'
  if (c.healthStatus === 'AT_RISK') {
    if (m.runway != null && m.runway < 6) return `${m.runway.toFixed(1)}mo runway`
    if (m.revenueGrowthMom != null && m.revenueGrowthMom < 0)
      return `Revenue ${formatPercent(m.revenueGrowthMom)} MoM`
  }
  if (m.runway != null) return `${m.runway.toFixed(0)}mo runway`
  return '—'
}

export function AtRiskPanel({ companies }: { companies: Company[] }) {
  const atRisk = companies.filter((c) => c.healthStatus === 'AT_RISK')
  const watchlist = companies.filter((c) => c.healthStatus === 'WATCHLIST')

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="text-amber-400" />
          <span className="text-[13px] font-medium">Needs Attention</span>
          <span className="text-[11px] text-muted-foreground tabular-nums bg-secondary rounded-full px-2 py-px">
            {companies.length}
          </span>
        </div>
        <Link
          href="/portfolio?health=AT_RISK"
          className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight size={11} />
        </Link>
      </div>

      {atRisk.length > 0 && (
        <div>
          <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-red-400/70 bg-red-500/5 border-b border-border">
            At Risk
          </p>
          {atRisk.map((c) => (
            <CompanyRow key={c.id} company={c} />
          ))}
        </div>
      )}

      {watchlist.length > 0 && (
        <div>
          <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-400/70 bg-amber-500/5 border-b border-border">
            Watchlist
          </p>
          {watchlist.map((c) => (
            <CompanyRow key={c.id} company={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function CompanyRow({ company: c }: { company: Company }) {
  return (
    <Link
      href={`/portfolio/${c.slug}`}
      className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-secondary/40 transition-colors group"
    >
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div
          className={cn(
            'h-7 w-7 rounded-md flex items-center justify-center text-[11px] font-semibold flex-shrink-0',
            c.healthStatus === 'AT_RISK' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/10 text-amber-400'
          )}
        >
          {c.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground truncate">{c.name}</p>
          <p className="text-[11px] text-muted-foreground">{keyMetric(c)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {c.topRisk && (
          <span className="hidden lg:block text-[11px] text-muted-foreground truncate max-w-[200px]">
            {c.topRisk.title}
          </span>
        )}
        <HealthBadge status={c.healthStatus as 'HEALTHY' | 'WATCHLIST' | 'AT_RISK'} showDot={false} />
        <ArrowRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}
