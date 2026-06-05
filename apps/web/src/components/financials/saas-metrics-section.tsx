'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatMrr, formatPercent, formatPeriod } from '@fundos/shared'
import { computeMrrBridgeDerived } from '@/lib/financial'
import type { SaasMetrics } from '@/lib/financial'
import { cn } from '@/lib/utils'

interface Props {
  saas: SaasMetrics
}

function Metric({ label, value, bench, color }: { label: string; value: string; bench?: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">{label}</p>
      <p className={cn('text-[14px] font-semibold tabular-nums mt-0.5', color ?? 'text-foreground')}>{value}</p>
      {bench && <p className="text-[10px] text-muted-foreground/50 mt-0.5">Bench: {bench}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[13px] font-medium mb-3">{title}</p>
      {children}
    </div>
  )
}

export function SaasMetricsSection({ saas }: Props) {
  const { mrrBridges, unitEconomics } = saas

  if (mrrBridges.length === 0 && unitEconomics.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-center text-[13px] text-muted-foreground py-8">
        No SaaS metrics logged yet. Use the "MRR Bridge" and "Unit Economics" buttons to add data.
      </div>
    )
  }

  const latestBridge = mrrBridges[0]
  const latestUE = unitEconomics[0]

  // MRR Bridge waterfall chart data
  const bridgeData = latestBridge
    ? [
        { name: 'Beginning', value: latestBridge.beginningMrr, fill: '#6b7280' },
        { name: 'New', value: latestBridge.newMrr, fill: '#34d399' },
        { name: 'Expansion', value: latestBridge.expansionMrr, fill: '#60a5fa' },
        { name: 'Reactivation', value: latestBridge.reactivationMrr, fill: '#a78bfa' },
        { name: 'Contraction', value: -latestBridge.contractionMrr, fill: '#fbbf24' },
        { name: 'Churn', value: -latestBridge.churnedMrr, fill: '#f87171' },
        { name: 'Ending', value: latestBridge.endingMrr, fill: '#6b7280' },
      ]
    : []

  const derived = latestBridge ? computeMrrBridgeDerived(latestBridge) : null

  return (
    <div className="space-y-4">
      {/* MRR Bridge */}
      {latestBridge && (
        <Section title={`MRR Bridge — ${formatPeriod(latestBridge.period)}`}>
          <div className="h-40 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bridgeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => `$${Math.abs(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => [`$${Math.abs(v).toLocaleString()}`, '']} contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {bridgeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Net New MRR" value={formatMrr(latestBridge.endingMrr - latestBridge.beginningMrr)} color={(latestBridge.endingMrr - latestBridge.beginningMrr) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
            <Metric label="Gross Rev Churn" value={derived?.grossRevChurn != null ? formatPercent(derived.grossRevChurn) : '—'} bench="< 5% monthly" />
            <Metric label="Quick Ratio" value={derived?.quickRatio != null ? `${derived.quickRatio.toFixed(1)}x` : '—'} bench="> 4x best-in-class" />
          </div>
        </Section>
      )}

      {/* Unit Economics */}
      {latestUE && (
        <Section title={`Unit Economics — ${formatPeriod(latestUE.period)}`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {latestUE.cac != null && <Metric label="CAC" value={formatMrr(latestUE.cac)} />}
            {latestUE.ltv != null && <Metric label="LTV" value={formatMrr(latestUE.ltv)} />}
            {latestUE.ltvCacRatio != null && (
              <Metric label="LTV:CAC" value={`${latestUE.ltvCacRatio.toFixed(1)}x`} bench="3–5x healthy"
                color={latestUE.ltvCacRatio >= 3 ? 'text-emerald-400' : latestUE.ltvCacRatio >= 1 ? 'text-amber-400' : 'text-red-400'} />
            )}
            {latestUE.cacPaybackMonths != null && (
              <Metric label="CAC Payback" value={`${Math.round(latestUE.cacPaybackMonths)}mo`} bench="< 18mo"
                color={latestUE.cacPaybackMonths <= 12 ? 'text-emerald-400' : latestUE.cacPaybackMonths <= 24 ? 'text-amber-400' : 'text-red-400'} />
            )}
            {latestUE.arpa != null && <Metric label="ARPA" value={formatMrr(latestUE.arpa)} />}
            {latestUE.burnMultiple != null && (
              <Metric label="Burn Multiple" value={`${latestUE.burnMultiple.toFixed(1)}x`} bench="< 1x excellent"
                color={latestUE.burnMultiple <= 1 ? 'text-emerald-400' : latestUE.burnMultiple <= 2 ? 'text-amber-400' : 'text-red-400'} />
            )}
            {latestUE.ruleOf40 != null && (
              <Metric label="Rule of 40" value={`${Math.round(latestUE.ruleOf40)}%`} bench="≥ 40 healthy"
                color={latestUE.ruleOf40 >= 40 ? 'text-emerald-400' : latestUE.ruleOf40 >= 20 ? 'text-amber-400' : 'text-red-400'} />
            )}
            {latestUE.magicNumber != null && (
              <Metric label="Magic Number" value={latestUE.magicNumber.toFixed(2)} bench="> 0.75 invest aggressively"
                color={latestUE.magicNumber >= 0.75 ? 'text-emerald-400' : latestUE.magicNumber >= 0.5 ? 'text-amber-400' : 'text-red-400'} />
            )}
          </div>
        </Section>
      )}
    </div>
  )
}
