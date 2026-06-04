'use client'

import { useState, useTransition } from 'react'
import { TrendCard } from './trend-card'
import { runTrendAnalysis } from '@/lib/trend-actions'
import type { TrendItem, TrendFilter } from '@/lib/trends'

interface TrendsListProps {
  initialTrends: TrendItem[]
  initialFilter: TrendFilter
}

const FILTERS: { label: string; value: TrendFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Shared Risk', value: 'SHARED_RISK' },
  { label: 'Fundraising', value: 'FUNDRAISING' },
  { label: 'Hiring', value: 'HIRING_PATTERN' },
  { label: 'Growth', value: 'GROWTH_PATTERN' },
  { label: 'Operational', value: 'OPERATIONAL' },
]

export function TrendsList({ initialTrends, initialFilter }: TrendsListProps) {
  const [trends, setTrends] = useState<TrendItem[]>(initialTrends)
  const [filter, setFilter] = useState<TrendFilter>(initialFilter)
  const [isRunning, startTransition] = useTransition()
  const [runResult, setRunResult] = useState<string | null>(null)

  const filtered = filter === 'ALL' ? trends : trends.filter((t) => t.category === filter)

  function handleDismissed(id: string) {
    setTrends((prev) => prev.filter((t) => t.id !== id))
  }

  function handleRunAnalysis() {
    startTransition(async () => {
      const result = await runTrendAnalysis()
      if (result.found > 0) {
        setRunResult(`${result.found} new trend${result.found > 1 ? 's' : ''} detected. Refresh to see them.`)
      } else {
        setRunResult('Analysis complete — no new trends found.')
      }
      setTimeout(() => setRunResult(null), 4000)
    })
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 text-[12px] font-medium transition-colors whitespace-nowrap ${
                filter === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {runResult && (
          <p className="text-[12px] text-muted-foreground">{runResult}</p>
        )}

        <button
          onClick={handleRunAnalysis}
          disabled={isRunning}
          className="h-8 px-3.5 rounded-md border border-border text-[12px] font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
        >
          {isRunning ? 'Analysing…' : 'Run Analysis'}
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState filter={filter} onRun={handleRunAnalysis} isRunning={isRunning} />
      ) : (
        <div className="space-y-3">
          {filtered.map((trend) => (
            <TrendCard key={trend.id} trend={trend} onDismissed={handleDismissed} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({
  filter,
  onRun,
  isRunning,
}: {
  filter: TrendFilter
  onRun: () => void
  isRunning: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center mb-3 text-lg">
        📊
      </div>
      <p className="text-[13px] font-medium text-foreground">
        {filter === 'ALL' ? 'No active trends' : `No ${filter.toLowerCase().replace(/_/g, ' ')} trends`}
      </p>
      <p className="text-[12px] text-muted-foreground mt-1 mb-4">
        {filter === 'ALL'
          ? 'Submit founder updates and run analysis to detect cross-portfolio patterns.'
          : 'No trends in this category. Try "All" or run a fresh analysis.'}
      </p>
      {filter === 'ALL' && (
        <button
          onClick={onRun}
          disabled={isRunning}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isRunning ? 'Analysing…' : 'Run Analysis Now'}
        </button>
      )}
    </div>
  )
}
