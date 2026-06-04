'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { UpdateCard } from './update-card'
import { ReviewSheet } from './review-sheet'
import { markUpdateReviewed } from '@/lib/update-actions'
import type { InboxUpdate, UpdateDetail, InboxFilter } from '@/lib/updates'

interface InboxProps {
  initialUpdates: InboxUpdate[]
}

const FILTERS: { label: string; value: InboxFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unreviewed', value: 'unreviewed' },
  { label: 'Reviewed', value: 'reviewed' },
]

export function Inbox({ initialUpdates }: InboxProps) {
  const [updates, setUpdates] = useState<InboxUpdate[]>(initialUpdates)
  const [filter, setFilter] = useState<InboxFilter>('all')
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [selectedUpdate, setSelectedUpdate] = useState<UpdateDetail | null>(null)
  const [, startTransition] = useTransition()

  const filtered = updates.filter((u) =>
    filter === 'unreviewed' ? !u.reviewedAt :
    filter === 'reviewed'   ? !!u.reviewedAt :
    true
  )

  // Keyboard navigation: j/k to move, Enter to open, r to review
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'j') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'k') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        openUpdate(filtered[activeIndex]!)
      } else if (e.key === 'r' && activeIndex >= 0) {
        const u = filtered[activeIndex]
        if (u && !u.reviewedAt) handleMarkReviewed(u.id)
      } else if (e.key === 'Escape') {
        setSelectedUpdate(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeIndex, filtered])

  const openUpdate = useCallback((update: InboxUpdate) => {
    // Build the detail shape from the inbox update (for immediate display)
    // while a full fetch would happen in a real app
    setSelectedUpdate({
      ...update,
      cashBalance: null,
      hiringNeeds: null,
      additionalNotes: null,
      fundraisingNote: null,
      company: update.company as UpdateDetail['company'],
      detectedRisks: update.detectedRisks as UpdateDetail['detectedRisks'],
      opportunities: [],
    } as unknown as UpdateDetail)
  }, [])

  const handleMarkReviewed = useCallback((id: string) => {
    startTransition(async () => {
      await markUpdateReviewed(id)
      setUpdates((prev) =>
        prev.map((u) => u.id === id ? { ...u, reviewedAt: new Date() } : u)
      )
      if (selectedUpdate?.id === id) {
        setSelectedUpdate((prev) => prev ? { ...prev, reviewedAt: new Date() } : null)
      }
    })
  }, [selectedUpdate])

  const unreviewedCount = updates.filter((u) => !u.reviewedAt).length

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => { setFilter(value); setActiveIndex(-1) }}
              className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                filter === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {unreviewedCount > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {unreviewedCount} unreviewed
          </span>
        )}
        <div className="flex-1" />
        <p className="text-[11px] text-muted-foreground/50 hidden sm:block">
          j/k navigate · Enter open · r review
        </p>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-2">
          {filtered.map((update, i) => (
            <UpdateCard
              key={update.id}
              update={update}
              isActive={i === activeIndex}
              onClick={() => { setActiveIndex(i); openUpdate(update) }}
              onMarkReviewed={() => handleMarkReviewed(update.id)}
            />
          ))}
        </div>
      )}

      {/* Detail sheet */}
      <ReviewSheet
        update={selectedUpdate}
        onClose={() => setSelectedUpdate(null)}
        onMarkReviewed={handleMarkReviewed}
      />
    </>
  )
}

function EmptyState({ filter }: { filter: InboxFilter }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
        <span className="text-lg">📬</span>
      </div>
      <p className="text-[13px] font-medium text-foreground">
        {filter === 'unreviewed' ? 'All caught up' : 'No updates'}
      </p>
      <p className="text-[12px] text-muted-foreground mt-1">
        {filter === 'unreviewed'
          ? 'No unreviewed founder updates.'
          : filter === 'reviewed'
          ? 'No reviewed updates yet.'
          : 'No founder updates have been submitted yet.'}
      </p>
    </div>
  )
}
