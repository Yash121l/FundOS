import * as React from 'react'
import { cn } from '../lib/utils'

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string
  delta?: string
  deltaDirection?: 'up' | 'down' | 'flat'
  deltaPositive?: boolean
  sub?: string
}

function MetricCard({
  label,
  value,
  delta,
  deltaDirection,
  deltaPositive,
  sub,
  className,
  ...props
}: MetricCardProps) {
  const isGood = deltaPositive ?? deltaDirection === 'up'
  const isBad = !deltaPositive && deltaDirection === 'down'

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card px-4 py-3.5 flex flex-col gap-1',
        className
      )}
      {...props}
    >
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {(delta || sub) && (
        <div className="flex items-center gap-1.5 mt-0.5">
          {delta && (
            <span
              className={cn(
                'text-[11px] font-medium tabular-nums',
                isGood && 'text-emerald-400',
                isBad && 'text-red-400',
                !isGood && !isBad && 'text-muted-foreground'
              )}
            >
              {deltaDirection === 'up' ? '↑' : deltaDirection === 'down' ? '↓' : '→'} {delta}
            </span>
          )}
          {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
        </div>
      )}
    </div>
  )
}

export { MetricCard }
