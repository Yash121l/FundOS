'use client'

import { useState } from 'react'
import { formatCurrency } from '@fundos/shared'
import { computeLiquidationWaterfall } from '@/lib/investment'
import type { CapTable } from '@/lib/investment'
import { cn } from '@/lib/utils'

interface Props {
  capTable: CapTable
}

export function LiquidationWaterfall({ capTable }: Props) {
  const [exitValue, setExitValue] = useState('')
  const [totalDebt, setTotalDebt] = useState('')

  const results = exitValue
    ? computeLiquidationWaterfall({
        exitValue: parseFloat(exitValue),
        entries: capTable.entries,
        optionPool: capTable.optionPools[0] ?? null,
        totalDebt: totalDebt ? parseFloat(totalDebt) : 0,
      })
    : []

  const totalDistributed = results.reduce((s, r) => s + r.totalProceeds, 0)

  const holderColors: Record<string, string> = {
    FOUNDER: 'bg-purple-500',
    INVESTOR: 'bg-blue-500',
    EMPLOYEE: 'bg-green-500',
    OPTION_POOL: 'bg-amber-500',
    WARRANT: 'bg-red-500',
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-muted-foreground">Enter a hypothetical exit value to see the distribution across all security holders.</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="waterfall-exit-value" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Exit Value ($)</label>
          <input
            id="waterfall-exit-value"
            type="number"
            value={exitValue}
            onChange={(e) => setExitValue(e.target.value)}
            placeholder="50000000"
            className="input w-full"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="waterfall-total-debt" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Debt ($)</label>
          <input
            id="waterfall-total-debt"
            type="number"
            value={totalDebt}
            onChange={(e) => setTotalDebt(e.target.value)}
            placeholder="0"
            className="input w-full"
          />
        </div>
      </div>

      {results.length > 0 && (
        <>
          {/* Distribution bar */}
          <div className="h-6 rounded-full overflow-hidden flex bg-secondary">
            {results.filter((r) => r.totalProceeds > 0).map((r, i) => {
              const pct = (r.totalProceeds / (parseFloat(exitValue) || 1)) * 100
              return (
                <div
                  key={i}
                  style={{ width: `${pct}%` }}
                  className={cn('h-full', holderColors[r.holderType] ?? 'bg-gray-500')}
                  title={`${r.holderName}: ${formatCurrency(r.totalProceeds, true)}`}
                />
              )
            })}
          </div>

          {/* Results table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left">
              <thead><tr className="bg-secondary/40 border-b border-border">
                <th className="py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Holder</th>
                <th className="py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Class</th>
                <th className="py-2 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Proceeds</th>
                <th className="py-2 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">% of Exit</th>
              </tr></thead>
              <tbody>
                {results
                  .sort((a, b) => b.totalProceeds - a.totalProceeds)
                  .map((r, i) => {
                    const pct = parseFloat(exitValue) > 0 ? (r.totalProceeds / parseFloat(exitValue)) * 100 : 0
                    return (
                      <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className={cn('h-2 w-2 rounded-full flex-shrink-0', holderColors[r.holderType] ?? 'bg-gray-400')} />
                            <span className="text-[12px] font-medium">{r.holderName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-muted-foreground">{r.shareClass}</td>
                        <td className="px-3 py-2 text-right text-[12px] font-semibold tabular-nums">{formatCurrency(r.totalProceeds, true)}</td>
                        <td className="px-3 py-2 text-right text-[12px] text-muted-foreground tabular-nums">{pct.toFixed(1)}%</td>
                      </tr>
                    )
                  })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-secondary/20">
                  <td className="px-3 py-2 text-[12px] font-semibold" colSpan={2}>Total Distributed</td>
                  <td className="px-3 py-2 text-right text-[12px] font-semibold tabular-nums">{formatCurrency(totalDistributed, true)}</td>
                  <td className="px-3 py-2 text-right text-[12px] text-muted-foreground">{parseFloat(exitValue) > 0 ? ((totalDistributed / parseFloat(exitValue)) * 100).toFixed(1) : '—'}%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Undistributed (rounding/debt) */}
          {parseFloat(exitValue) - totalDistributed - (totalDebt ? parseFloat(totalDebt) : 0) > 1 && (
            <p className="text-[11px] text-muted-foreground">
              Note: {formatCurrency(parseFloat(exitValue) - totalDistributed, true)} undistributed (debt repayment or rounding)
            </p>
          )}
        </>
      )}

      {capTable.entries.length === 0 && (
        <p className="text-[12px] text-muted-foreground text-center py-4">Add cap table entries first to run the waterfall.</p>
      )}
    </div>
  )
}
