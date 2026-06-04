import * as React from 'react'
import { cn } from '../lib/utils'

type HealthStatus = 'HEALTHY' | 'WATCHLIST' | 'AT_RISK'

const STYLES: Record<HealthStatus, string> = {
  HEALTHY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  WATCHLIST: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  AT_RISK: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const LABELS: Record<HealthStatus, string> = {
  HEALTHY: 'Healthy',
  WATCHLIST: 'Watchlist',
  AT_RISK: 'At Risk',
}

const DOT: Record<HealthStatus, string> = {
  HEALTHY: 'bg-emerald-400',
  WATCHLIST: 'bg-amber-400',
  AT_RISK: 'bg-red-400',
}

interface HealthBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: HealthStatus
  showDot?: boolean
}

function HealthBadge({ status, showDot = true, className, ...props }: HealthBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium tabular-nums',
        STYLES[status],
        className
      )}
      {...props}
    >
      {showDot && <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', DOT[status])} />}
      {LABELS[status]}
    </span>
  )
}

export { HealthBadge }
export type { HealthStatus }
