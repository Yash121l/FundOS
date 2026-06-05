'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Calendar, CheckCircle2, Star, TrendingUp, Users, FileText, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BoardDashboard } from '@/lib/board-actions'
import { logValueAddActivity, submitFollowOnToIC, resolveFollowOnNote, approveValuation } from '@/lib/board-actions'

const TABS = ['Board Meetings', 'Follow-on Notes', 'Value-Add', 'Annual Valuations'] as const
type Tab = typeof TABS[number]

const MEETING_STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  HELD: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CANCELLED: 'bg-secondary/50 text-muted-foreground border-border',
}

const FOLLOW_ON_STYLES: Record<string, string> = {
  FOLLOW_ON: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PASS: 'bg-red-500/10 text-red-400 border-red-500/20',
  BRIDGE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  WATCH: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

const VALUE_ADD_ICONS: Record<string, React.ElementType> = {
  TALENT_INTRO: Users,
  CUSTOMER_BD: TrendingUp,
  PR_FACILITATION: Star,
  FUNDRAISE_COACHING: FileText,
  CO_INVESTOR_INTRO: Users,
  REGULATORY_GUIDANCE: CheckCircle2,
  OTHER: Plus,
}

const VALUATION_METHOD_LABELS: Record<string, string> = {
  LAST_ROUND: 'Last Round',
  ARR_MULTIPLE: 'ARR Multiple',
  DCF: 'DCF',
  PWERM: 'PWERM',
  OPM: 'OPM',
  NET_ASSETS: 'Net Assets',
}

interface Props { data: BoardDashboard }

export function BoardDashboardView({ data }: Props) {
  const { meetings, followOnNotes, valueAdd, valuations } = data
  const [tab, setTab] = useState<Tab>('Board Meetings')
  const [boardActionPending, startBoardAction] = useTransition()
  const [vaError, setVaError] = useState<string | null>(null)

  // Value-add log form state
  const [showValueAddForm, setShowValueAddForm] = useState(false)
  const [vaCompanyId, setVaCompanyId] = useState('')
  const [vaType, setVaType] = useState<string>('TALENT_INTRO')
  const [vaTitle, setVaTitle] = useState('')
  const [vaOutcome, setVaOutcome] = useState('')

  const VALID_VA_TYPES = new Set(['TALENT_INTRO', 'CUSTOMER_BD', 'PR_FACILITATION', 'FUNDRAISE_COACHING', 'CO_INVESTOR_INTRO', 'REGULATORY_GUIDANCE', 'OTHER'])

  function handleLogValueAdd() {
    if (!vaCompanyId || !vaTitle) return
    if (!VALID_VA_TYPES.has(vaType)) return
    setVaError(null)
    startBoardAction(async () => {
      try {
        await logValueAddActivity({
          companyId: vaCompanyId,
          type: vaType as 'TALENT_INTRO' | 'CUSTOMER_BD' | 'PR_FACILITATION' | 'FUNDRAISE_COACHING' | 'CO_INVESTOR_INTRO' | 'REGULATORY_GUIDANCE' | 'OTHER',
          title: vaTitle,
          outcome: vaOutcome,
        })
        setShowValueAddForm(false)
        setVaTitle(''); setVaOutcome('')
      } catch {
        setVaError('Failed to log activity.')
      }
    })
  }

  // Unique companies from meetings for value-add form
  const companiesFromMeetings = Array.from(
    new Map(meetings.map((m) => [m.company.id, m.company])).values()
  )

  return (
    <div className="p-5 max-w-[1440px] w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-foreground">Board Management</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Board meetings, follow-on assessments, value-add activities, and annual valuations
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Board Meetings', value: meetings.length, icon: Calendar, sub: 'Total tracked' },
          { label: 'Follow-on Notes', value: followOnNotes.length, icon: FileText, sub: 'All periods' },
          { label: 'Value-Add Activities', value: valueAdd.length, icon: Star, sub: 'Logged this year' },
          { label: 'Valuations', value: valuations.length, icon: TrendingUp, sub: 'Annual marks' },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="rounded-xl border border-border bg-card px-4 py-3.5">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
              <Icon size={14} className="text-muted-foreground" />
            </div>
            <p className="text-[22px] font-semibold text-foreground tabular-nums">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors flex-shrink-0 whitespace-nowrap',
              tab === t
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Board Meetings Tab */}
      {tab === 'Board Meetings' && (
        <div className="space-y-3">
          {meetings.length === 0 ? (
            <EmptyState icon={Calendar} title="No board meetings" sub="Board meetings will appear here once scheduled." />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 border-b border-border bg-card/50">
                {['Company', 'Type', 'Date', 'Status', 'Resolutions'].map((col) => (
                  <p key={col} className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{col}</p>
                ))}
              </div>
              {meetings.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col gap-2 sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr] sm:gap-4 px-4 py-3 border-b border-border last:border-0 items-start sm:items-center hover:bg-secondary/10 transition-colors"
                >
                  <Link href={`/portfolio/${m.company.slug}`} className="text-[12px] font-medium text-foreground hover:text-primary">
                    {m.company.name}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">{m.type.replace('_', ' ')}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(m.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <span className={cn('inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-semibold uppercase w-fit', MEETING_STATUS_STYLES[m.status])}>
                    {m.status}
                  </span>
                  <p className="text-[11px] text-muted-foreground tabular-nums">{m.resolutions.length} resolved</p>
                </div>
              ))}
            </div>
          )}

          {/* Minutes preview for last held meeting */}
          {meetings.find((m) => m.status === 'HELD' && m.minutesContent) && (() => {
            const m = meetings.find((m) => m.status === 'HELD' && m.minutesContent)!
            return (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[12px] font-semibold text-foreground mb-2">
                  Latest Minutes — {m.company.name} ({new Date(m.meetingDate).toLocaleDateString()})
                </p>
                <p className="text-[11px] text-muted-foreground whitespace-pre-wrap line-clamp-6">{m.minutesContent}</p>
                {m.nextQuarterPlan && (
                  <>
                    <p className="text-[11px] font-semibold text-foreground mt-3 mb-1">Next Quarter Plan</p>
                    <p className="text-[11px] text-muted-foreground whitespace-pre-wrap line-clamp-4">{m.nextQuarterPlan}</p>
                  </>
                )}
                {m.resolutions.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold text-foreground mt-3 mb-2">Resolutions</p>
                    <div className="space-y-1">
                      {m.resolutions.map((r) => (
                        <div key={r.id} className="flex items-center gap-2">
                          <span className={cn(
                            'inline-flex rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase',
                            r.outcome === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              r.outcome === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-secondary/50 text-muted-foreground border-border'
                          )}>
                            {r.outcome}
                          </span>
                          <p className="text-[11px] text-foreground">{r.title}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Follow-on Notes Tab */}
      {tab === 'Follow-on Notes' && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">Internal follow-on assessment notes prepared at each milestone review. Advances to IC if follow-on is being considered.</p>
          {followOnNotes.length === 0 ? (
            <EmptyState icon={FileText} title="No follow-on notes" sub="Create follow-on notes from company pages." />
          ) : (
            <div className="space-y-3">
              {followOnNotes.map((note) => (
                <div key={note.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Link href={`/portfolio/${note.company.slug}`} className="text-[13px] font-semibold text-foreground hover:text-primary">
                          {note.company.name}
                        </Link>
                        <span className="text-[11px] text-muted-foreground">{note.period}</span>
                        <span className={cn('inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-semibold uppercase', FOLLOW_ON_STYLES[note.recommendation])}>
                          {note.recommendation.replace('_', ' ')}
                        </span>
                      </div>
                      {note.amount && (
                        <p className="text-[11px] text-muted-foreground">
                          Proposed: ${(note.amount / 1_000_000).toFixed(1)}M
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {note.status === 'DRAFT' && (
                        <button
                          onClick={() => startBoardAction(async () => { await submitFollowOnToIC(note.id) })}
                          disabled={boardActionPending}
                          className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {boardActionPending ? 'Submitting…' : 'Submit to IC'}
                        </button>
                      )}
                      {note.status === 'IC_SUBMITTED' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startBoardAction(async () => { await resolveFollowOnNote(note.id, 'APPROVED') })}
                            disabled={boardActionPending}
                            className="h-7 px-3 rounded-md bg-emerald-600 text-white text-[11px] font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => startBoardAction(async () => { await resolveFollowOnNote(note.id, 'DECLINED') })}
                            disabled={boardActionPending}
                            className="h-7 px-3 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[12px] text-foreground">{note.rationale}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={cn(
                      'inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-semibold uppercase',
                      note.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        note.status === 'DECLINED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          note.status === 'IC_SUBMITTED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-secondary/50 text-muted-foreground border-border'
                    )}>
                      {note.status.replace('_', ' ')}
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Prepared by {note.preparedBy?.name ?? 'PM'} · {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {note.icNotes && (
                    <p className="text-[11px] text-muted-foreground mt-2 border-t border-border pt-2">IC Notes: {note.icNotes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Value-Add Tab */}
      {tab === 'Value-Add' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">Track VC support activities across the portfolio.</p>
            <button
              onClick={() => setShowValueAddForm(!showValueAddForm)}
              className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors"
            >
              + Log Activity
            </button>
          </div>

          {showValueAddForm && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-[12px] font-semibold text-foreground">Log Value-Add Activity</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Company</label>
                  <select
                    value={vaCompanyId}
                    onChange={(e) => setVaCompanyId(e.target.value)}
                    className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground"
                  >
                    <option value="">Select company...</option>
                    {companiesFromMeetings.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Activity Type</label>
                  <select
                    value={vaType}
                    onChange={(e) => setVaType(e.target.value)}
                    className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground"
                  >
                    {['TALENT_INTRO', 'CUSTOMER_BD', 'PR_FACILITATION', 'FUNDRAISE_COACHING', 'CO_INVESTOR_INTRO', 'REGULATORY_GUIDANCE', 'OTHER'].map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Title / Description</label>
                <input
                  type="text"
                  value={vaTitle}
                  onChange={(e) => setVaTitle(e.target.value)}
                  placeholder="e.g., Intro to Andreessen Horowitz for Series B"
                  className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Outcome (optional)</label>
                <input
                  type="text"
                  value={vaOutcome}
                  onChange={(e) => setVaOutcome(e.target.value)}
                  placeholder="e.g., Intro made; follow-up meeting scheduled"
                  className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground"
                />
              </div>
              {vaError && <p className="text-[11px] text-red-400">{vaError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleLogValueAdd}
                  disabled={boardActionPending}
                  className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {boardActionPending ? 'Saving…' : 'Log'}
                </button>
                <button
                  onClick={() => setShowValueAddForm(false)}
                  disabled={boardActionPending}
                  className="h-7 px-3 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {valueAdd.length === 0 ? (
            <EmptyState icon={Star} title="No value-add activities" sub="Log activities like talent intros, customer BD, and fundraise coaching." />
          ) : (
            <div className="space-y-2">
              {valueAdd.map((va) => {
                const Icon = VALUE_ADD_ICONS[va.type] ?? Plus
                return (
                  <div key={va.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-start gap-3">
                    <Icon size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/portfolio/${va.company.slug}`} className="text-[12px] font-semibold text-foreground hover:text-primary">
                          {va.company.name}
                        </Link>
                        <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 uppercase tracking-wide">
                          {va.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-[12px] text-foreground mt-0.5">{va.title}</p>
                      {va.outcome && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">→ {va.outcome}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {va.activityDate ? new Date(va.activityDate).toLocaleDateString() : 'Date not set'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Annual Valuations Tab */}
      {tab === 'Annual Valuations' && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Portfolio company fair values updated annually using comparable company analysis or last round method. Feeds NAV report for LPs.
          </p>
          {valuations.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No annual valuations" sub="Annual fair value marks will appear here once created." />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 border-b border-border bg-card/50">
                {['Company', 'Year', 'Fair Value', 'Change', 'Method', 'Status'].map((col) => (
                  <p key={col} className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{col}</p>
                ))}
              </div>
              {valuations.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-col gap-2 sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] sm:gap-4 px-4 py-3 border-b border-border last:border-0 items-start sm:items-center"
                >
                  <Link href={`/portfolio/${v.company.slug}`} className="text-[12px] font-medium text-foreground hover:text-primary">
                    {v.company.name}
                  </Link>
                  <p className="text-[12px] tabular-nums text-foreground">{v.year}</p>
                  <p className="text-[12px] tabular-nums font-semibold text-foreground">
                    ${(v.fairValue / 1_000_000).toFixed(1)}M
                  </p>
                  <p className={cn(
                    'text-[12px] tabular-nums font-medium',
                    v.changePercent == null ? 'text-muted-foreground' :
                      v.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {v.changePercent == null ? '—' : `${v.changePercent >= 0 ? '+' : ''}${(v.changePercent * 100).toFixed(0)}%`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{VALUATION_METHOD_LABELS[v.method] ?? v.method}</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'inline-flex rounded border px-2 py-0.5 text-[9px] font-semibold uppercase',
                      v.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        v.status === 'REVIEWED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-secondary/50 text-muted-foreground border-border'
                    )}>
                      {v.status}
                    </span>
                    {v.status === 'DRAFT' && (
                      <button
                        onClick={() => startBoardAction(async () => { await approveValuation(v.id) })}
                        disabled={boardActionPending}
                        className="h-5 px-2 rounded border border-emerald-500/30 text-emerald-400 text-[9px] font-semibold hover:bg-emerald-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-12 text-center">
      <Icon size={24} className="text-muted-foreground mb-2" />
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </div>
  )
}
