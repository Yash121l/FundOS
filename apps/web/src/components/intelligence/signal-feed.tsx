'use client'

import { useState, useEffect } from 'react'
import { SignalCard } from './signal-card'
import type { SignalItem, SignalFilter } from '@/lib/signals'

interface SignalFeedProps {
  initialSignals: SignalItem[]
  initialFilter: SignalFilter
  counts: Record<string, number>
}

const FILTERS: { label: string; value: SignalFilter; key?: string }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Funding', value: 'FUNDING_NEWS', key: 'FUNDING_NEWS' },
  { label: 'Competitor', value: 'COMPETITOR_ACTIVITY', key: 'COMPETITOR_ACTIVITY' },
  { label: 'Market', value: 'MARKET_TREND', key: 'MARKET_TREND' },
  { label: 'Regulatory', value: 'REGULATION', key: 'REGULATION' },
  { label: 'Acquisition', value: 'ACQUISITION', key: 'ACQUISITION' },
]

const STORAGE_KEY = 'fundos:read-signals'

function loadReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch { /* ignore */ }
}

export function SignalFeed({ initialSignals, initialFilter, counts }: SignalFeedProps) {
  const [filter, setFilter] = useState<SignalFilter>(initialFilter)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [showRead, setShowRead] = useState(false)

  useEffect(() => {
    setReadIds(loadReadIds())
  }, [])

  const filtered = filter === 'ALL'
    ? initialSignals
    : initialSignals.filter((s) => s.category === filter)

  const unread = filtered.filter((s) => !readIds.has(s.id))
  const read = filtered.filter((s) => readIds.has(s.id))
  const displayed = showRead ? filtered : unread

  function markRead(id: string) {
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveReadIds(next)
      return next
    })
  }

  function markAllRead() {
    const allIds = new Set([...readIds, ...filtered.map((s) => s.id)])
    setReadIds(allIds)
    saveReadIds(allIds)
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {FILTERS.map(({ label, value, key }) => {
            const count = key ? (counts[key] ?? 0) : (counts.total ?? 0)
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-1.5 text-[12px] font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  filter === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`text-[10px] tabular-nums rounded px-1 ${
                    filter === value ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        {unread.length > 0 && (
          <button
            onClick={markAllRead}
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Signal list */}
      {displayed.length === 0 && unread.length === 0 ? (
        <EmptyState filter={filter} />
      ) : displayed.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[13px] text-muted-foreground">All signals marked as read.</p>
          <button onClick={() => setShowRead(true)} className="text-[12px] text-primary hover:underline mt-1">
            Show {read.length} read signal{read.length !== 1 ? 's' : ''}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              isRead={readIds.has(signal.id)}
              onMarkRead={markRead}
            />
          ))}
        </div>
      )}

      {/* Show/hide read toggle */}
      {!showRead && read.length > 0 && unread.length > 0 && (
        <button
          onClick={() => setShowRead(true)}
          className="mt-4 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          ▸ Show {read.length} read signal{read.length !== 1 ? 's' : ''}
        </button>
      )}
      {showRead && read.length > 0 && (
        <button
          onClick={() => setShowRead(false)}
          className="mt-4 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          ▾ Hide read signals
        </button>
      )}
    </div>
  )
}

function EmptyState({ filter }: { filter: SignalFilter }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center mb-3 text-lg">📡</div>
      <p className="text-[13px] font-medium text-foreground">No signals this week</p>
      <p className="text-[12px] text-muted-foreground mt-1">
        {filter === 'ALL'
          ? 'No market signals in the database yet. Run the seed to populate signals.'
          : `No ${filter.replace(/_/g, ' ').toLowerCase()} signals found.`}
      </p>
    </div>
  )
}
