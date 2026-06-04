'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { HealthBadge } from '@fundos/ui'
import { formatRelativeTime } from '@fundos/shared'
import { cn } from '@/lib/utils'
import { dismissTrend, createActionFromTrend } from '@/lib/trend-actions'
import type { TrendItem } from '@/lib/trends'

interface TrendCardProps {
  trend: TrendItem
  onDismissed: (id: string) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  SHARED_RISK: 'Shared Risk',
  HIRING_PATTERN: 'Hiring',
  FUNDRAISING: 'Fundraising',
  GROWTH_PATTERN: 'Growth',
  OPERATIONAL: 'Operational',
  MARKET_EVENT: 'Market',
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  LOW: 'text-muted-foreground bg-secondary/50 border-border',
}

export function TrendCard({ trend, onDismissed }: TrendCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showActionForm, setShowActionForm] = useState(false)
  const [actionTitle, setActionTitle] = useState('')
  const [actionDesc, setActionDesc] = useState('')
  const [actionResult, setActionResult] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleDismiss() {
    startTransition(async () => {
      try {
        await dismissTrend(trend.id)
        onDismissed(trend.id)
      } catch (err) {
        console.error('[TrendCard] Failed to dismiss trend:', err)
        setActionResult('Failed to dismiss. Please try again.')
        setTimeout(() => setActionResult(null), 4000)
      }
    })
  }

  function handleCreateAction() {
    if (!actionTitle.trim()) return
    startTransition(async () => {
      try {
        const result = await createActionFromTrend(trend.id, actionTitle.trim(), actionDesc.trim())
        if (result.success) {
          setActionResult(`Action created for ${result.actionsCreated} compan${result.actionsCreated === 1 ? 'y' : 'ies'}`)
          setShowActionForm(false)
          setActionTitle('')
          setActionDesc('')
          setTimeout(() => setActionResult(null), 4000)
        } else {
          setActionResult(result.error ?? 'Failed to create action.')
          setTimeout(() => setActionResult(null), 4000)
        }
      } catch (err) {
        console.error('[TrendCard] Failed to create trend action:', err)
        setActionResult('Failed to create action. Please try again.')
        setTimeout(() => setActionResult(null), 4000)
      }
    })
  }

  const categoryLabel = CATEGORY_LABELS[trend.category] ?? trend.category
  const severityStyle = SEVERITY_STYLES[trend.severity] ?? SEVERITY_STYLES.LOW

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold', severityStyle)}>
              {trend.severity}
            </span>
            <span className="inline-flex items-center rounded-md border border-border bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {categoryLabel}
            </span>
          </div>
          <h3 className="text-[13px] font-semibold text-foreground leading-snug">{trend.title}</h3>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{trend.summary}</p>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="text-[11px] font-semibold text-foreground tabular-nums">{trend.affectedCount}</p>
          <p className="text-[10px] text-muted-foreground">companies</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">{formatRelativeTime(trend.detectedAt)}</p>
        </div>
      </div>

      {/* Evidence chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {trend.evidence.slice(0, 4).map((ev) => (
          <Link
            key={ev.id}
            href={`/portfolio/${ev.company.slug}`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/30 px-2.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span className={cn(
              'h-1.5 w-1.5 rounded-full flex-shrink-0',
              ev.company.healthStatus === 'HEALTHY' ? 'bg-emerald-400' :
              ev.company.healthStatus === 'AT_RISK' ? 'bg-red-400' : 'bg-amber-400'
            )} />
            {ev.company.name}
          </Link>
        ))}
        {trend.evidence.length > 4 && (
          <span className="text-[11px] text-muted-foreground">+{trend.evidence.length - 4} more</span>
        )}
      </div>

      {/* Evidence expand */}
      {expanded && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Evidence</p>
          {trend.evidence.map((ev) => (
            <div key={ev.id} className="rounded-md bg-secondary/30 border border-border/50 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <HealthBadge status={ev.company.healthStatus} showDot={false} />
                <Link
                  href={`/portfolio/${ev.company.slug}`}
                  className="text-[11px] font-semibold text-foreground hover:underline"
                >
                  {ev.company.name}
                </Link>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed italic">&ldquo;{ev.quote}&rdquo;</p>
            </div>
          ))}
        </div>
      )}

      {/* Create action inline form */}
      {showActionForm && (
        <div className="border border-border rounded-lg bg-secondary/20 p-3 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Create Action — applies to all {trend.affectedCount} companies
          </p>
          <label htmlFor={`action-title-${trend.id}`} className="sr-only">Action title</label>
          <input
            id={`action-title-${trend.id}`}
            autoFocus
            type="text"
            placeholder="Action title"
            value={actionTitle}
            onChange={(e) => setActionTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateAction()}
            className="input w-full"
          />
          <label htmlFor={`action-desc-${trend.id}`} className="sr-only">Description (optional)</label>
          <textarea
            id={`action-desc-${trend.id}`}
            rows={2}
            placeholder="Description (optional)"
            value={actionDesc}
            onChange={(e) => setActionDesc(e.target.value)}
            className="input w-full resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleCreateAction} className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors">
              Create Action
            </button>
            <button onClick={() => setShowActionForm(false)} className="h-7 px-3 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-accent transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/50 flex-wrap">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="h-7 px-3 rounded-md border border-border text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {expanded ? 'Hide Evidence' : `View Evidence (${trend.evidence.length})`}
        </button>
        <button
          onClick={() => setShowActionForm((v) => !v)}
          className="h-7 px-3 rounded-md border border-border text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          + Create Action
        </button>
        {actionResult && <span className="text-[11px] text-emerald-400">{actionResult}</span>}
        <button
          onClick={handleDismiss}
          className="h-7 px-3 rounded-md text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors ml-auto"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
