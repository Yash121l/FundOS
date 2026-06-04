'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  data: { HEALTHY: number; WATCHLIST: number; AT_RISK: number }
}

const CONFIG = [
  { key: 'HEALTHY' as const, label: 'Healthy', color: '#34d399' },
  { key: 'WATCHLIST' as const, label: 'Watchlist', color: '#fbbf24' },
  { key: 'AT_RISK' as const, label: 'At Risk', color: '#f87171' },
]

interface TooltipPayload {
  name: string
  value: number
  payload: { color: string }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0]!
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-[12px] shadow-lg">
      <span style={{ color: item.payload.color }} className="font-medium">
        {item.name}:
      </span>{' '}
      <span className="text-foreground tabular-nums">{item.value} companies</span>
    </div>
  )
}

export function HealthDonutChart({ data }: Props) {
  const total = data.HEALTHY + data.WATCHLIST + data.AT_RISK
  const chartData = CONFIG.map((c) => ({ name: c.label, value: data[c.key], color: c.color }))

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[13px] font-medium mb-3">Portfolio Health</p>

      <div className="relative">
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={64}
              paddingAngle={2}
              strokeWidth={0}
              dataKey="value"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-semibold tabular-nums">{total}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Companies</p>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        {CONFIG.map((c) => (
          <div key={c.key} className="flex flex-col items-center">
            <span
              className="text-lg font-semibold tabular-nums"
              style={{ color: c.color }}
            >
              {data[c.key]}
            </span>
            <span className="text-[10px] text-muted-foreground">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
