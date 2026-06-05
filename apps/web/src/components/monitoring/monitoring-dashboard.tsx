'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clock, FileText, TrendingDown, AlertCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MonitoringDashboard } from '@/lib/monitoring-actions'
import { resolveEscalation, dismissEscalation } from '@/lib/monitoring-actions'

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
  HIGH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  MEDIUM: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  LOW: 'bg-secondary/50 text-muted-foreground border-border',
}

const SEVERITY_ICON: Record<string, React.ElementType> = {
  CRITICAL: XCircle,
  HIGH: AlertTriangle,
  MEDIUM: AlertCircle,
  LOW: Clock,
}

const MOR_STATUS_STYLES: Record<string, string> = {
  SUBMITTED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REVIEWED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ESCALATED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PENDING: 'bg-secondary/50 text-muted-foreground border-border',
  LATE: 'bg-red-500/10 text-red-400 border-red-500/20',
  DUE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const ESCALATION_TYPE_LABELS: Record<string, string> = {
  BURN_EXCESS: 'Burn Excess',
  REVENUE_MISS: 'Revenue Miss',
  LOW_RUNWAY: 'Low Runway',
  TEAM_EVENT: 'Team Event',
  LEGAL: 'Legal',
  DOWN_ROUND: 'Down Round',
  CUSTOMER_CONCENTRATION: 'Customer Concentration',
  LATE_SUBMISSION: 'Late MOR',
  OTHER: 'Other',
}

interface Props {
  data: MonitoringDashboard
}

export function MonitoringDashboardView({ data }: Props) {
  const { complianceRows, escalations, submittedCount, lateCount, totalCompanies } = data
  const dueDateThisMonth = data.dueDateThisMonth instanceof Date
    ? data.dueDateThisMonth
    : new Date(data.dueDateThisMonth)
  const [resolveId, setResolveId] = useState<string | null>(null)
  const [responseNote, setResponseNote] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState(false)

  const criticalCount = escalations.filter((e) => e.severity === 'CRITICAL').length
  const highCount = escalations.filter((e) => e.severity === 'HIGH').length

  async function handleResolve(escalationId: string) {
    setActionPending(true)
    setActionError(null)
    try {
      await resolveEscalation(escalationId, responseNote)
      setResolveId(null)
      setResponseNote('')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to resolve escalation.')
    } finally {
      setActionPending(false)
    }
  }

  async function handleDismiss(escalationId: string) {
    setActionPending(true)
    setActionError(null)
    try {
      await dismissEscalation(escalationId)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to dismiss escalation.')
    } finally {
      setActionPending(false)
    }
  }

  return (
    <div className="p-5 max-w-[1440px] w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-foreground">Portfolio Monitoring</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            MOR compliance, escalation tracking, and PM workflow
          </p>
        </div>
        <Link
          href="/monitoring/mor/new"
          className="h-8 px-3.5 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
        >
          + Submit MOR
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'MORs Submitted', value: `${submittedCount}/${totalCompanies}`,
            sub: 'Current month',
            icon: FileText, color: 'text-blue-400',
          },
          {
            label: 'Late / Missing', value: lateCount,
            sub: 'Overdue this period',
            icon: Clock, color: lateCount > 0 ? 'text-amber-400' : 'text-muted-foreground',
          },
          {
            label: 'Critical Flags', value: criticalCount,
            sub: 'Require immediate action',
            icon: XCircle, color: criticalCount > 0 ? 'text-red-400' : 'text-muted-foreground',
          },
          {
            label: 'High Flags', value: highCount,
            sub: 'IC escalation pending',
            icon: AlertTriangle, color: highCount > 0 ? 'text-amber-400' : 'text-muted-foreground',
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card px-4 py-3.5">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
              <Icon size={14} className={color} />
            </div>
            <p className="text-[22px] font-semibold text-foreground tabular-nums">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {actionError && (
        <p className="text-[12px] text-red-400 px-1">{actionError}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Escalation Panel */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-foreground">Open Escalations</h2>
            <span className="text-[11px] text-muted-foreground">{escalations.length} open</span>
          </div>

          {escalations.length === 0 ? (
            <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 size={24} className="text-emerald-400 mb-2" />
              <p className="text-[13px] font-medium text-foreground">No open escalations</p>
              <p className="text-[11px] text-muted-foreground mt-1">All portfolio companies within thresholds.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {escalations.map((esc) => {
                const Icon = SEVERITY_ICON[esc.severity] ?? AlertCircle
                return (
                  <div
                    key={esc.id}
                    className={cn(
                      'rounded-xl border p-3.5 space-y-2',
                      esc.severity === 'CRITICAL' ? 'border-red-500/20 bg-red-500/5' :
                        esc.severity === 'HIGH' ? 'border-amber-500/20 bg-amber-500/5' :
                          'border-border bg-card'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Icon size={14} className={SEVERITY_STYLES[esc.severity]?.split(' ')[1] ?? 'text-muted-foreground'} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/portfolio/${esc.company.slug}`}
                            className="text-[12px] font-semibold text-foreground hover:text-primary truncate"
                          >
                            {esc.company.name}
                          </Link>
                          <span className={cn(
                            'inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                            SEVERITY_STYLES[esc.severity]
                          )}>
                            {esc.severity}
                          </span>
                          {esc.escalatedToIC && (
                            <span className="inline-flex items-center rounded border border-purple-500/20 bg-purple-500/10 text-purple-400 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                              IC NOTIFIED
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] font-medium text-foreground mt-0.5">{esc.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{esc.details}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {ESCALATION_TYPE_LABELS[esc.type] ?? esc.type} · {new Date(esc.detectedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {resolveId === esc.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full text-[11px] bg-background border border-border rounded-md px-2.5 py-2 text-foreground placeholder:text-muted-foreground resize-none"
                          rows={2}
                          placeholder="Response note / action taken..."
                          value={responseNote}
                          onChange={(e) => setResponseNote(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolve(esc.id)}
                            disabled={actionPending}
                            className="h-6 px-2.5 rounded-md bg-emerald-600 text-white text-[10px] font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
                          >
                            Mark Resolved
                          </button>
                          <button
                            onClick={() => setResolveId(null)}
                            className="h-6 px-2.5 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setResolveId(esc.id)}
                          className="h-6 px-2.5 rounded-md border border-border text-[10px] font-medium text-foreground hover:bg-accent transition-colors"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleDismiss(esc.id)}
                          className="h-6 px-2.5 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* MOR Compliance Tracker */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-semibold text-foreground">
                MOR Compliance — {data.reportingPeriod}
              </h2>
              <p className={cn(
                'text-[10px] mt-0.5',
                data.isPastDue
                  ? 'text-red-400'
                  : new Date() > new Date(dueDateThisMonth.getTime() - 5 * 86400000)
                    ? 'text-amber-400'
                    : 'text-muted-foreground'
              )}>
                {data.isPastDue
                  ? `OVERDUE — was due ${dueDateThisMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : `Due ${dueDateThisMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${Math.ceil((dueDateThisMonth.getTime() - new Date().getTime()) / 86400000)} days remaining`
                }
              </p>
            </div>
            <Link href="/monitoring/mor" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              View all →
            </Link>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-2 border-b border-border bg-card/50">
              {['Company', 'Status', 'Revenue vs Plan', 'Runway'].map((col) => (
                <p key={col} className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{col}</p>
              ))}
            </div>

            {complianceRows.length === 0 ? (
              <div className="py-10 text-center text-[12px] text-muted-foreground">No portfolio companies found.</div>
            ) : (
              <div>
                {complianceRows.slice(0, 15).map((row) => {
                  const status = row.isLate ? 'LATE' : (row.mor?.status ?? (data.isPastDue ? 'LATE' : 'PENDING'))
                  const revVsBudget = row.mor?.revenueVsBudgetPct

                  return (
                    <div
                      key={row.id}
                      className="flex flex-col gap-2 sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr] sm:gap-4 px-4 py-3 border-b border-border last:border-0 items-start sm:items-center hover:bg-secondary/10 transition-colors"
                    >
                      <div>
                        <Link
                          href={`/portfolio/${row.slug}`}
                          className="text-[12px] font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {row.name}
                        </Link>
                        <p className="text-[10px] text-muted-foreground">
                          {row.sector}
                          {row.isLate && row.daysOverdue > 0 && (
                            <span className="ml-1 text-red-400"> · {row.daysOverdue}d overdue</span>
                          )}
                        </p>
                      </div>

                      <span className={cn(
                        'inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide w-fit',
                        MOR_STATUS_STYLES[status] ?? MOR_STATUS_STYLES.PENDING
                      )}>
                        {status}
                      </span>

                      <p className={cn(
                        'text-[12px] tabular-nums font-medium',
                        revVsBudget == null ? 'text-muted-foreground' :
                          revVsBudget >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {revVsBudget == null
                          ? '—'
                          : `${revVsBudget >= 0 ? '+' : ''}${(revVsBudget * 100).toFixed(0)}%`}
                      </p>

                      <p className={cn(
                        'text-[12px] tabular-nums',
                        !row.mor?.runway ? 'text-muted-foreground' :
                          row.mor.runway < 6 ? 'text-red-400 font-semibold' :
                            row.mor.runway < 12 ? 'text-amber-400' : 'text-foreground'
                      )}>
                        {row.mor?.runway != null ? `${row.mor.runway.toFixed(0)}mo` : '—'}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Escalation Protocol Reference */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold text-foreground mb-3">Escalation Protocol</p>
            <div className="space-y-2">
              {[
                { tag: 'CRITICAL', color: 'text-red-400 border-red-500/20 bg-red-500/10', text: 'Runway < 6 months → Emergency board session within 5 days' },
                { tag: 'CRITICAL', color: 'text-red-400 border-red-500/20 bg-red-500/10', text: 'Co-founder departure / conflict → Emergency board call within 48hrs' },
                { tag: 'HIGH', color: 'text-amber-400 border-amber-500/20 bg-amber-500/10', text: 'Burn >20% above plan (2+ months) → Cost conservation plan within 7 days' },
                { tag: 'HIGH', color: 'text-amber-400 border-amber-500/20 bg-amber-500/10', text: 'Revenue miss 2+ months → GTM audit + IC flagged' },
                { tag: 'MEDIUM', color: 'text-blue-400 border-blue-500/20 bg-blue-500/10', text: 'Customer concentration >35% → BD diversification push at next board' },
                { tag: 'LOW', color: 'text-muted-foreground border-border bg-secondary/50', text: 'MOR submitted late → Reminder sent; escalate if pattern (3+ months)' },
              ].map(({ tag, color, text }) => (
                <div key={text} className="flex items-start gap-2">
                  <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide flex-shrink-0 mt-px', color)}>
                    {tag}
                  </span>
                  <p className="text-[11px] text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent MOR submissions */}
      <div>
        <h2 className="text-[13px] font-semibold text-foreground mb-3">Recent MOR Submissions</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 border-b border-border bg-card/50">
            {['Company', 'Period', 'Status', 'AI Summary', 'Flags'].map((col) => (
              <p key={col} className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{col}</p>
            ))}
          </div>
          {complianceRows.filter((r) => r.mor?.status && r.mor.status !== 'PENDING').slice(0, 8).map((row) => {
            const mor = row.mor!
            let flags: Array<{ severity: string }> = []
            try { flags = mor.aiFlags ? JSON.parse(mor.aiFlags as string) : [] } catch { flags = [] }
            const critFlag = flags.find((f) => f.severity === 'CRITICAL')
            const highFlag = flags.find((f) => f.severity === 'HIGH')
            const flagSeverity = critFlag ? 'CRITICAL' : highFlag ? 'HIGH' : flags.length > 0 ? 'MEDIUM' : null

            return (
              <div
                key={mor.id}
                className="flex flex-col gap-2 sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr] sm:gap-4 px-4 py-3 border-b border-border last:border-0 items-start sm:items-center"
              >
                <p className="text-[12px] font-medium text-foreground">{row.name}</p>
                <p className="text-[12px] text-muted-foreground tabular-nums">{mor.period}</p>
                <span className={cn('inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-semibold uppercase w-fit', MOR_STATUS_STYLES[mor.status])}>
                  {mor.status}
                </span>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{mor.aiSummary ?? '—'}</p>
                {flagSeverity ? (
                  <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase w-fit', SEVERITY_STYLES[flagSeverity])}>
                    {flags.length} flag{flags.length !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Clean
                  </span>
                )}
              </div>
            )
          })}
          {complianceRows.filter((r) => r.mor?.status && r.mor.status !== 'PENDING').length === 0 && (
            <div className="py-10 text-center text-[12px] text-muted-foreground">No MOR submissions yet this period.</div>
          )}
        </div>
      </div>

      {/* Value-Add quick log hint */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[12px] font-semibold text-foreground mb-1">Value-Add Execution</p>
        <p className="text-[11px] text-muted-foreground mb-3">
          Track VC support: talent intros, customer BD, PR facilitation, fundraise coaching, co-investor intros, regulatory guidance.
        </p>
        <Link
          href="/board"
          className="h-7 px-3 rounded-md border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors inline-flex items-center gap-1.5"
        >
          <TrendingDown size={12} /> Go to Board Management →
        </Link>
      </div>
    </div>
  )
}
