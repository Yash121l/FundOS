import { formatMrr, formatPercent, formatNumber, formatRunway } from '@fundos/shared'
import { cn } from '@/lib/utils'

interface FundMetrics {
  totalMrr: number
  totalArr: number
  totalBurn: number
  totalHeadcount: number
  avgGrowth: number
  avgRunway: number
  mrrDelta: number | null
  burnDelta: number | null
}

function DeltaChip({ delta, invert = false }: { delta: number | null; invert?: boolean }) {
  if (delta == null) return null
  const isPositive = invert ? delta < 0 : delta > 0
  const isNegative = invert ? delta > 0 : delta < 0
  return (
    <span
      className={cn(
        'text-[11px] font-medium tabular-nums',
        isPositive && 'text-emerald-400',
        isNegative && 'text-red-400',
        !isPositive && !isNegative && 'text-muted-foreground'
      )}
    >
      {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}{' '}
      {Math.abs(delta * 100).toFixed(1)}% vs 3mo
    </span>
  )
}

export function FundMetricsRow({ data }: { data: FundMetrics }) {
  const metrics = [
    {
      label: 'Total ARR',
      value: formatMrr(data.totalArr),
      sub: <DeltaChip delta={data.mrrDelta} />,
    },
    {
      label: 'Avg MoM Growth',
      value: formatPercent(data.avgGrowth),
      sub: <span className="text-[11px] text-muted-foreground">across portfolio</span>,
    },
    {
      label: 'Total Monthly Burn',
      value: formatMrr(data.totalBurn),
      sub: <DeltaChip delta={data.burnDelta} invert />,
    },
    {
      label: 'Avg Runway',
      value: formatRunway(data.avgRunway),
      sub: <span className="text-[11px] text-muted-foreground">{formatNumber(data.totalHeadcount)} headcount</span>,
    },
  ]

  return (
    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map(({ label, value, sub }) => (
        <div
          key={label}
          className="rounded-xl border border-border bg-card px-4 py-4 flex flex-col gap-1"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {label}
          </p>
          <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
          <div className="mt-0.5">{sub}</div>
        </div>
      ))}
    </div>
  )
}
