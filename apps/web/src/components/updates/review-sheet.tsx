'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { HealthBadge } from '@fundos/ui'
import {
  formatMrr, formatCurrency, formatRunway, formatDate,
  sectorLabel, stageLabel,
  severityLabel, formatRelativeTime
} from '@fundos/shared'
import { cn } from '@/lib/utils'
import { createTaskFromUpdate } from '@/lib/update-actions'
import type { UpdateDetail } from '@/lib/updates'

const TONE_STYLES: Record<string, string> = {
  confident: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  cautious: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  distressed: 'bg-red-500/10 border-red-500/20 text-red-400',
  uncertain: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
}

function ToneBadge({ tone }: { tone: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize',
      TONE_STYLES[tone] ?? TONE_STYLES.uncertain
    )}>
      {tone} tone
    </span>
  )
}

interface ReviewSheetProps {
  update: UpdateDetail | null
  onClose: () => void
  onMarkReviewed: (id: string) => void
}

export function ReviewSheet({ update, onClose, onMarkReviewed }: ReviewSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskCreated, setTaskCreated] = useState(false)
  const [taskError, setTaskError] = useState('')
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!update) return
    setShowTaskForm(false)
    setTaskTitle('')
    setTaskDesc('')
    setTaskCreated(false)
    setTaskError('')
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTaskForm) { setShowTaskForm(false); return }
        onClose()
      }
      if (e.key === 't' && !showTaskForm && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        setShowTaskForm(true)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [update, onClose, showTaskForm])

  function handleCreateTask() {
    if (!taskTitle.trim() || !update) return
    setTaskError('')
    startTransition(async () => {
      try {
        await createTaskFromUpdate(update.company.id, taskTitle.trim(), taskDesc.trim())
        setTaskCreated(true)
        setShowTaskForm(false)
        setTaskTitle('')
        setTaskDesc('')
      } catch (err) {
        console.error('[handleCreateTask] failed', err)
        setTaskError('Failed to create task. Please try again.')
      }
    })
  }

  if (!update) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-background border-l border-border z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-[14px] font-semibold text-foreground">{update.company.name}</h2>
              <HealthBadge status={update.company.healthStatus} showDot />
            </div>
            <p className="text-[12px] text-muted-foreground">
              {sectorLabel(update.company.sector)} · {stageLabel(update.company.stage)} · {update.period}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* AI Summary */}
          {update.aiSummary && (
            <Section title="AI Analysis">
              {update.founderTone && (
                <div className="mb-2">
                  <ToneBadge tone={update.founderTone} />
                </div>
              )}
              <p className="text-[13px] text-muted-foreground leading-relaxed">{update.aiSummary}</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                PortfolioAnalyst{process.env.NEXT_PUBLIC_OPENAI_ENABLED === 'true' ? ' · gpt-4o-mini' : ''} · {formatRelativeTime(update.createdAt)}
              </p>
            </Section>
          )}

          {/* Metrics */}
          <Section title="Reported Metrics">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'MRR', value: formatMrr(update.mrr) },
                { label: 'Monthly Burn', value: update.burnRate ? formatCurrency(update.burnRate, true) : '—' },
                { label: 'Cash Balance', value: update.cashBalance ? formatCurrency(update.cashBalance, true) : '—' },
                { label: 'Runway', value: formatRunway(update.runway) },
                { label: 'Headcount', value: update.headcount != null ? String(update.headcount) : '—' },
                { label: 'Fundraising', value: update.fundraisingStatus.replace(/_/g, ' ') },
              ].map(({ label, value }) => (
                <div key={label} className="bg-secondary/30 rounded-md px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">{label}</p>
                  <p className="text-[13px] font-semibold tabular-nums text-foreground mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Wins */}
          <Section title="Wins">
            <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{update.wins}</p>
          </Section>

          {/* Risks narrative */}
          <Section title="Risks & Concerns">
            <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{update.risks}</p>
          </Section>

          {/* Detected Risks */}
          {update.detectedRisks.length > 0 && (
            <Section title={`Detected Risks (${update.detectedRisks.length})`}>
              <div className="space-y-2">
                {update.detectedRisks.map((r) => (
                  <div key={r.id} className={cn(
                    'rounded-md border px-3 py-2.5',
                    r.severity === 'CRITICAL' ? 'border-red-500/30 bg-red-500/5' :
                    r.severity === 'HIGH' ? 'border-orange-500/30 bg-orange-500/5' :
                    'border-border bg-secondary/20'
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        'text-[10px] font-semibold uppercase tracking-wide',
                        r.severity === 'CRITICAL' ? 'text-red-400' :
                        r.severity === 'HIGH' ? 'text-orange-400' :
                        r.severity === 'MEDIUM' ? 'text-amber-400' : 'text-muted-foreground'
                      )}>
                        {severityLabel(r.severity)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{r.category}</span>
                    </div>
                    <p className="text-[12px] font-medium text-foreground">{r.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{r.description}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Opportunities */}
          {update.opportunities.length > 0 && (
            <Section title={`Opportunities (${update.opportunities.length})`}>
              <div className="space-y-2">
                {update.opportunities.map((o) => (
                  <div key={o.id} className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">{o.category}</span>
                    </div>
                    <p className="text-[12px] font-medium text-foreground">{o.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{o.description}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Additional fields */}
          {update.hiringNeeds && (
            <Section title="Hiring Needs">
              <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{update.hiringNeeds}</p>
            </Section>
          )}

          {update.fundraisingNote && (
            <Section title="Fundraising Note">
              <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{update.fundraisingNote}</p>
            </Section>
          )}

          {update.additionalNotes && (
            <Section title="Additional Notes">
              <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{update.additionalNotes}</p>
            </Section>
          )}
        </div>

        {/* Create task inline form */}
        {showTaskForm && (
          <div className="px-5 py-3.5 border-t border-border bg-secondary/20 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">New Task</p>
            <input
              autoFocus
              type="text"
              placeholder="Task title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
              className="input w-full"
            />
            <textarea
              rows={2}
              placeholder="Description (optional)"
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="input w-full resize-none"
            />
            {taskError && <p className="text-[11px] text-red-400">{taskError}</p>}
            <div className="flex gap-2">
              <button onClick={handleCreateTask} className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors">
                Create Task
              </button>
              <button onClick={() => setShowTaskForm(false)} className="h-7 px-3 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-accent transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border flex items-center gap-2">
          {!update.reviewedAt ? (
            <button
              onClick={() => onMarkReviewed(update.id)}
              className="flex-1 h-8 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
            >
              Mark Reviewed
            </button>
          ) : (
            <p className="text-[12px] text-muted-foreground flex-1">
              Reviewed {formatDate(update.reviewedAt)}
            </p>
          )}
          {taskCreated && <span className="text-[11px] text-emerald-400">✓ Task created</span>}
          <button
            onClick={() => setShowTaskForm((v) => !v)}
            className="h-8 px-3 rounded-md border border-border text-[12px] font-medium text-muted-foreground hover:bg-accent transition-colors"
            title="Create task (t)"
          >
            + Task
          </button>
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-md border border-border text-[12px] font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h3>
      {children}
    </div>
  )
}
