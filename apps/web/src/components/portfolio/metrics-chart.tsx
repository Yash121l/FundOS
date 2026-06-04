'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatMrr, formatPeriod } from '@fundos/shared'

interface MetricPoint {
  period: string
  mrr: number | null
  burnRate: number | null
}

interface TooltipPayload {
  name: string
  value: number
  color: string
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-[12px] shadow-xl space-y-1">
      <p className="text-muted-foreground font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="tabular-nums">
          {p.name}: {formatMrr(p.value)}
        </p>
      ))}
    </div>
  )
}

interface Props {
  data: MetricPoint[]
}

export function MetricsChart({ data }: Props) {
  const chartData = [...data]
    .reverse()
    .slice(-13)
    .map((d) => ({
      period: formatPeriod(d.period),
      MRR: d.mrr ?? 0,
      Burn: d.burnRate ?? 0,
    }))

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[13px] font-medium mb-4">MRR History</p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.65 0.19 264)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="oklch(0.65 0.19 264)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.62 0.22 29)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="oklch(0.62 0.22 29)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="oklch(0.22 0 0)"
            vertical={false}
          />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10, fill: 'oklch(0.55 0 0)' }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            tickFormatter={(v: number) => formatMrr(v)}
            tick={{ fontSize: 10, fill: 'oklch(0.55 0 0)' }}
            tickLine={false}
            axisLine={false}
            width={54}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="MRR"
            stroke="oklch(0.65 0.19 264)"
            strokeWidth={2}
            fill="url(#mrrGrad)"
          />
          <Area
            type="monotone"
            dataKey="Burn"
            stroke="oklch(0.62 0.22 29)"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            fill="url(#burnGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-4 rounded bg-primary opacity-80" />
          <span className="text-[11px] text-muted-foreground">MRR</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-px w-4 border-t-2 border-dashed border-destructive opacity-70" />
          <span className="text-[11px] text-muted-foreground">Burn</span>
        </div>
      </div>
    </div>
  )
}
