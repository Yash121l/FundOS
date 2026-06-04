import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Props {
  data: { HEALTHY: number; WATCHLIST: number; AT_RISK: number }
}

const STATUS = [
  {
    key: 'HEALTHY' as const,
    label: 'Healthy',
    dot: 'bg-emerald-400',
    value: 'text-emerald-400',
    border: 'border-emerald-500/15 hover:border-emerald-500/30',
    bg: 'hover:bg-emerald-500/5',
  },
  {
    key: 'WATCHLIST' as const,
    label: 'Watchlist',
    dot: 'bg-amber-400',
    value: 'text-amber-400',
    border: 'border-amber-500/15 hover:border-amber-500/30',
    bg: 'hover:bg-amber-500/5',
  },
  {
    key: 'AT_RISK' as const,
    label: 'At Risk',
    dot: 'bg-red-400',
    value: 'text-red-400',
    border: 'border-red-500/20 hover:border-red-500/35',
    bg: 'hover:bg-red-500/5',
  },
]

export function PortfolioHealthSummary({ data }: Props) {
  return (
    <div className="flex gap-3">
      {STATUS.map(({ key, label, dot, value, border, bg }) => (
        <Link
          key={key}
          href={`/portfolio?health=${key}`}
          className={cn(
            'flex flex-col gap-1 rounded-xl border bg-card px-5 py-4 min-w-[110px] transition-colors',
            border,
            bg
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', dot)} />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </span>
          </div>
          <p className={cn('text-3xl font-semibold tabular-nums tracking-tight', value)}>
            {data[key]}
          </p>
        </Link>
      ))}
    </div>
  )
}
