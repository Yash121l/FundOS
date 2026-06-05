'use client'

import Link from 'next/link'
import { formatMrr, formatCurrency, formatRunway, formatGrowth, formatRelativeTime } from '@fundos/shared'
import { HealthBadge } from '@fundos/ui'
import { AlertTriangle, TrendingUp, Newspaper, Clock, CheckCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FounderCompany } from '@/lib/founder'

type MORStatus = {
  reportingPeriod: string
  dueDate: Date
  daysUntilDue: number
  isOverdue: boolean
  isSubmitted: boolean
  isDueSoon: boolean
  currentMor: { id: string; status: string; submittedAt: Date | null; aiSummary: string | null; period: string; escalations: Array<{ severity: string; title: string }> } | null
  recentMors: Array<{ id: string; period: string; status: string; submittedAt: Date | null; aiSummary: string | null; revenueVsBudgetPct: number | null; runway: number | null }>
  currentWeekPing: { id: string; week: string; submittedAt: Date } | null
  currentWeek: string
}

interface Props {
  company: FounderCompany
  kpis: {
    current: { mrr: number | null; burnRate: number | null; runway: number | null; headcount: number | null; revenueGrowthMom: number | null } | null
    previous: { mrr: number | null; burnRate: number | null; runway: number | null; headcount: number | null } | null
    period: string
    prev: string
  }
  userName: string
  morStatus: MORStatus
}

const RISK_SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-amber-400',
  LOW: 'text-blue-400',
}

const NEWS_TYPE_LABELS: Record<string, string> = {
  CUSTOMER_WIN: 'Customer Win',
  PARTNERSHIP: 'Partnership',
  PRODUCT_LAUNCH: 'Product Launch',
  HIRING_UPDATE: 'Hiring',
  PRESS_MENTION: 'Press',
  OTHER: 'Update',
}

export function FounderDashboard({ company, kpis, userName, morStatus }: Props) {
  const { current, previous, period } = kpis
  const latestUpdate = company.updates[0]

  function delta(curr: number | null, prev: number | null) {
    if (curr == null || prev == null || prev === 0) return null
    return (curr - prev) / prev
  }

  const mrrDelta = delta(current?.mrr ?? null, previous?.mrr ?? null)
  const runwayDelta = delta(current?.runway ?? null, previous?.runway ?? null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Welcome back, {userName.split(' ')[0]}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <HealthBadge status={company.healthStatus} />
            <span className="text-xs text-muted-foreground">{company.sector} · {company.stage.replace('_', ' ')}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/founder/update"
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Send size={13} />
            Submit Update
          </Link>
          <Link
            href="/founder/news"
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors"
          >
            <Newspaper size={13} />
            Share News
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          label="MRR"
          value={current?.mrr != null ? formatMrr(current.mrr) : '—'}
          delta={mrrDelta}
          period={period}
        />
        <KPICard
          label="Growth (MoM)"
          value={current?.revenueGrowthMom != null ? formatGrowth(current.revenueGrowthMom) : '—'}
          colorValue={current?.revenueGrowthMom}
        />
        <KPICard
          label="Monthly Burn"
          value={current?.burnRate != null ? formatCurrency(current.burnRate) : '—'}
        />
        <KPICard
          label="Runway"
          value={current?.runway != null ? formatRunway(current.runway) : '—'}
          delta={runwayDelta}
          invertDelta
        />
      </div>

      {/* MOR status banner */}
      {(morStatus.isOverdue || morStatus.isDueSoon || morStatus.isSubmitted) && (
        <div className={cn(
          'rounded-lg border p-3 flex items-center justify-between gap-3',
          morStatus.isOverdue
            ? 'border-red-500/40 bg-red-500/10'
            : morStatus.isDueSoon
            ? 'border-amber-500/40 bg-amber-500/10'
            : 'border-emerald-500/40 bg-emerald-500/10'
        )}>
          <div className="flex items-center gap-2 min-w-0">
            {morStatus.isOverdue ? (
              <AlertTriangle size={14} className="flex-shrink-0 text-red-400" />
            ) : morStatus.isSubmitted ? (
              <CheckCircle size={14} className="flex-shrink-0 text-emerald-400" />
            ) : (
              <Clock size={14} className="flex-shrink-0 text-amber-400" />
            )}
            <p className="text-[12px] font-medium truncate">
              {morStatus.isOverdue
                ? `Monthly Report Overdue — ${morStatus.reportingPeriod}`
                : morStatus.isSubmitted
                ? `Monthly Report Submitted — ${morStatus.reportingPeriod}`
                : `Monthly Report Due in ${morStatus.daysUntilDue} day${morStatus.daysUntilDue !== 1 ? 's' : ''} — ${morStatus.reportingPeriod}`}
            </p>
          </div>
          {!morStatus.isSubmitted && (
            <Link
              href="/founder/update"
              className="flex-shrink-0 text-[11px] font-medium text-primary hover:underline"
            >
              Submit now
            </Link>
          )}
        </div>
      )}

      {/* Health score */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Health Score</p>
          <span className="text-2xl font-semibold tabular-nums">{Math.round(company.healthScore)}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              company.healthScore >= 65 ? 'bg-emerald-500' :
              company.healthScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
            )}
            style={{ width: `${Math.min(company.healthScore, 100)}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          {company.healthStatus === 'HEALTHY'
            ? 'Your company is performing well across key metrics.'
            : company.healthStatus === 'WATCHLIST'
            ? 'Some metrics need attention — submit an update to keep your investors informed.'
            : 'Action required — please submit an update and reach out to your investor.'}
        </p>
      </div>

      {/* Latest update */}
      {latestUpdate ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Latest Update</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">{latestUpdate.period}</span>
              {latestUpdate.reviewedAt ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <CheckCircle size={10} /> Reviewed
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-medium">
                  <Clock size={10} /> Pending review
                </span>
              )}
            </div>
          </div>
          {latestUpdate.aiSummary ? (
            <p className="text-[13px] text-foreground leading-relaxed">{latestUpdate.aiSummary}</p>
          ) : (
            <p className="text-[13px] text-muted-foreground italic">AI analysis in progress…</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">
            Submitted {formatRelativeTime(latestUpdate.createdAt)}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border border-dashed bg-card/50 p-6 text-center">
          <Send size={20} className="mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-[13px] font-medium mb-1">No updates submitted yet</p>
          <p className="text-[12px] text-muted-foreground mb-3">
            Submit your first monthly update to keep your investors informed.
          </p>
          <Link
            href="/founder/update"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Submit Update
          </Link>
        </div>
      )}

      {/* Open risks */}
      {company.risks.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide mb-3">Open Risks</p>
          <ul className="space-y-2">
            {company.risks.map((r) => (
              <li key={r.id} className="flex items-start gap-2">
                <AlertTriangle
                  size={13}
                  className={cn('mt-0.5 flex-shrink-0', RISK_SEVERITY_COLORS[r.severity] ?? 'text-muted-foreground')}
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground">{r.severity} · {r.category}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent news */}
      {company.newsSubmissions.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Recent News</p>
            <Link href="/founder/news" className="text-[11px] text-primary hover:underline">Share more</Link>
          </div>
          <ul className="space-y-3">
            {company.newsSubmissions.slice(0, 3).map((n) => (
              <li key={n.id} className="flex items-start gap-2">
                <TrendingUp size={13} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-px rounded">
                      {NEWS_TYPE_LABELS[n.type] ?? n.type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formatRelativeTime(n.createdAt)}</span>
                  </div>
                  <p className="text-[12px] font-medium text-foreground">{n.title}</p>
                  {n.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Update history */}
      {company.updates.length > 1 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide mb-3">Update History</p>
          <ul className="space-y-1.5">
            {company.updates.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium tabular-nums">{u.period}</span>
                  {u.mrr != null && (
                    <span className="text-[11px] text-muted-foreground">{formatMrr(u.mrr)} MRR</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{formatRelativeTime(u.createdAt)}</span>
                  {u.reviewedAt ? (
                    <CheckCircle size={11} className="text-emerald-400" />
                  ) : (
                    <Clock size={11} className="text-muted-foreground/50" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface KPICardProps {
  label: string
  value: string
  delta?: number | null
  invertDelta?: boolean
  colorValue?: number | null
  period?: string
}

function KPICard({ label, value, delta, invertDelta, colorValue, period }: KPICardProps) {
  // invertDelta: for metrics where a decrease is good (e.g. runway going down
  // is bad, but burn going down is good). When invertDelta=true, a negative
  // delta renders green rather than red.
  const isPositive = delta != null ? (invertDelta ? delta < 0 : delta > 0) : null

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={cn(
        'text-lg font-semibold tabular-nums',
        colorValue != null && colorValue > 0 ? 'text-emerald-400' :
        colorValue != null && colorValue < 0 ? 'text-red-400' : 'text-foreground'
      )}>
        {value}
      </p>
      {delta != null && (
        <p className={cn(
          'text-[10px] mt-0.5',
          isPositive ? 'text-emerald-400' : 'text-red-400'
        )}>
          {isPositive ? '↑' : '↓'} {Math.abs(delta * 100).toFixed(1)}% vs prior
        </p>
      )}
      {period && !delta && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{period}</p>
      )}
    </div>
  )
}
