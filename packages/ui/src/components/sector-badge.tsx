import * as React from 'react'
import { cn } from '../lib/utils'

type Sector = 'SAAS' | 'FINTECH' | 'AI' | 'DEVTOOLS' | 'CLIMATETECH' | 'HEALTHTECH' | 'MARKETPLACE' | 'INFRASTRUCTURE' | 'OTHER'

const LABELS: Record<Sector, string> = {
  SAAS: 'SaaS',
  FINTECH: 'Fintech',
  AI: 'AI',
  DEVTOOLS: 'DevTools',
  CLIMATETECH: 'ClimateTech',
  HEALTHTECH: 'HealthTech',
  MARKETPLACE: 'Marketplace',
  INFRASTRUCTURE: 'Infrastructure',
  OTHER: 'Other',
}

const COLORS: Record<Sector, string> = {
  SAAS: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  FINTECH: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  AI: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  DEVTOOLS: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  CLIMATETECH: 'bg-green-500/10 text-green-400 border-green-500/20',
  HEALTHTECH: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  MARKETPLACE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  INFRASTRUCTURE: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  OTHER: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

interface SectorBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  sector: Sector | string
}

function SectorBadge({ sector, className, ...props }: SectorBadgeProps) {
  const key = sector as Sector
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium',
        COLORS[key] ?? COLORS.OTHER,
        className
      )}
      {...props}
    >
      {LABELS[key] ?? sector}
    </span>
  )
}

export { SectorBadge }
export type { Sector }
