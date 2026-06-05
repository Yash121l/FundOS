import Link from 'next/link'
import { ExternalLink, ArrowLeft } from 'lucide-react'
import { HealthBadge, SectorBadge } from '@fundos/ui'
import { formatMrr, formatPercent, formatRunway, formatNumber, stageLabel } from '@fundos/shared'
import { cn } from '@/lib/utils'
import type { CompanyDetail } from '@/lib/portfolio'

type Metric = NonNullable<CompanyDetail['metrics']>[number]

function MetricPill({
  label,
  value,
  delta,
  deltaDirection,
}: {
  label: string
  value: string
  delta?: string | null
  deltaDirection?: 'up' | 'down' | 'flat'
}) {
  return (
    <div className="flex flex-col gap-0.5 flex-shrink-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap">
        {label}
      </p>
      <p className="text-base font-semibold tabular-nums text-foreground whitespace-nowrap">{value}</p>
      {delta && (
        <p
          className={cn(
            'text-[11px] tabular-nums',
            deltaDirection === 'up' && 'text-emerald-400',
            deltaDirection === 'down' && 'text-red-400',
            deltaDirection === 'flat' && 'text-muted-foreground'
          )}
        >
          {deltaDirection === 'up' ? '↑' : deltaDirection === 'down' ? '↓' : '→'} {delta}
        </p>
      )}
    </div>
  )
}

interface Props {
  company: CompanyDetail
  latest: Metric | null
  prev: Metric | null
}

export function CompanyHeader({ company: c, latest, prev }: Props) {
  const mrrDelta =
    latest?.mrr != null && prev?.mrr != null && prev.mrr > 0
      ? (latest.mrr - prev.mrr) / prev.mrr
      : null
  const runwayDir =
    latest?.runway != null && prev?.runway != null
      ? latest.runway > prev.runway
        ? 'up'
        : latest.runway < prev.runway
        ? 'down'
        : 'flat'
      : undefined

  return (
    <div className="border-b border-border bg-card">
      {/* Breadcrumb + company identity */}
      <div className="px-4 sm:px-6 pt-4 pb-3 space-y-2">
        <div>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft size={12} />
            Portfolio
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-[15px] font-semibold text-primary flex-shrink-0">
              {c.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{c.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <SectorBadge sector={c.sector} />
                <span className="text-[12px] text-muted-foreground">{stageLabel(c.stage)}</span>
                {c.foundedYear && (
                  <span className="text-[12px] text-muted-foreground">Est. {c.foundedYear}</span>
                )}
                {c.website && (
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    {c.website.replace(/^https?:\/\//, '')}
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <HealthBadge status={c.healthStatus as 'HEALTHY' | 'WATCHLIST' | 'AT_RISK'} />
        </div>

        {c.description && (
          <p className="text-[13px] text-muted-foreground max-w-2xl mt-1">{c.description}</p>
        )}
      </div>

      {/* Metrics strip */}
      <div className="px-4 sm:px-6 py-3 border-t border-border flex items-start gap-6 overflow-x-auto">
        <MetricPill
          label="MRR"
          value={latest?.mrr != null ? formatMrr(latest.mrr) : '—'}
          delta={mrrDelta != null ? formatPercent(mrrDelta) : null}
          deltaDirection={mrrDelta != null ? (mrrDelta > 0 ? 'up' : mrrDelta < 0 ? 'down' : 'flat') : undefined}
        />
        <div className="w-px h-8 bg-border self-center flex-shrink-0" />
        <MetricPill
          label="ARR"
          value={latest?.mrr != null ? formatMrr(latest.mrr * 12) : '—'}
        />
        <div className="w-px h-8 bg-border self-center flex-shrink-0" />
        <MetricPill
          label="Monthly Burn"
          value={latest?.burnRate != null ? formatMrr(latest.burnRate) : '—'}
        />
        <div className="w-px h-8 bg-border self-center flex-shrink-0" />
        <MetricPill
          label="Runway"
          value={latest?.runway != null ? formatRunway(latest.runway) : '—'}
          deltaDirection={runwayDir}
        />
        <div className="w-px h-8 bg-border self-center flex-shrink-0" />
        <MetricPill
          label="Headcount"
          value={latest?.headcount != null ? formatNumber(latest.headcount) : '—'}
        />
        <div className="w-px h-8 bg-border self-center flex-shrink-0" />
        <MetricPill
          label="Health Score"
          value={`${Math.round(c.healthScore)}`}
        />
        {latest?.grossMargin != null && (
          <>
            <div className="w-px h-8 bg-border self-center flex-shrink-0" />
            <MetricPill label="Gross Margin" value={formatPercent(latest.grossMargin)} />
          </>
        )}
        {latest?.nrr != null && (
          <>
            <div className="w-px h-8 bg-border self-center flex-shrink-0" />
            <MetricPill label="NRR" value={`${latest.nrr}%`} />
          </>
        )}
      </div>
    </div>
  )
}
