'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitWeeklyKpiPing, type WeeklyKpiPingData } from '@/lib/founder-actions'
import { CheckCircle, TrendingUp } from 'lucide-react'

interface Props {
  week: string  // "2026-W23"
  alreadySubmitted: boolean
}

const DEFAULT_KPIS = [
  'MRR',
  'New Customers / Logos',
  'Churn',
  'Gross Margin %',
  'Pipeline Value',
]

export function FounderWeeklyForm({ week, alreadySubmitted }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(alreadySubmitted)

  const [kpis, setKpis] = useState(
    DEFAULT_KPIS.map((label) => ({ label, value: '' }))
  )
  const [founderNote, setFounderNote] = useState('')

  function safeNum(v: string | undefined): number | null {
    if (!v) return null
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const data: WeeklyKpiPingData = {
        week,
        kpi1Label: kpis[0]?.label, kpi1Value: safeNum(kpis[0]?.value),
        kpi2Label: kpis[1]?.label, kpi2Value: safeNum(kpis[1]?.value),
        kpi3Label: kpis[2]?.label, kpi3Value: safeNum(kpis[2]?.value),
        kpi4Label: kpis[3]?.label, kpi4Value: safeNum(kpis[3]?.value),
        kpi5Label: kpis[4]?.label, kpi5Value: safeNum(kpis[4]?.value),
        founderNote: founderNote || undefined,
      }
      await submitWeeklyKpiPing(data)
      setSubmitted(true)
    } catch (err) {
      console.error('Failed to submit weekly KPI ping:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
        <CheckCircle size={28} className="mx-auto text-emerald-400 mb-3" />
        <h2 className="text-[14px] font-semibold mb-1">Weekly KPI ping submitted</h2>
        <p className="text-[12px] text-muted-foreground mb-4">
          Week {week} metrics logged. Your PM will review any anomalies.
        </p>
        <button
          onClick={() => router.push('/founder/dashboard')}
          className="h-8 px-4 rounded-md text-[12px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-primary" />
          <p className="text-[12px] font-semibold">Week {week} — Quick KPI Check-in</p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Submit your 5 core metrics for this week. This is a lightweight async ping — not your full MOR. Takes ~2 minutes.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-[12px] font-semibold">5 Core Metrics</p>
        <div className="grid grid-cols-[2fr_1fr] gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide px-0.5 mb-1">
          <span>Metric</span><span>This week</span>
        </div>
        {kpis.map((kpi, i) => (
          <div key={i} className="grid grid-cols-[2fr_1fr] gap-2 items-center">
            <input
              type="text"
              value={kpi.label}
              onChange={(e) => setKpis(kpis.map((k, j) => j === i ? { ...k, label: e.target.value } : k))}
              className="text-[12px] bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground"
              placeholder={`KPI ${i + 1}`}
            />
            <input
              type="number" step="any"
              value={kpi.value}
              onChange={(e) => setKpis(kpis.map((k, j) => j === i ? { ...k, value: e.target.value } : k))}
              className="text-[12px] bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <label className="block text-[12px] font-semibold mb-2">Any quick note for your PM? (optional)</label>
        <textarea
          value={founderNote}
          onChange={(e) => setFounderNote(e.target.value)}
          rows={3}
          placeholder="Anything unusual this week, a win you want to flag, or a blocker you need help with…"
          className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="h-9 px-5 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit Weekly Ping'}
        </button>
        <p className="text-[11px] text-muted-foreground">Takes effect immediately. Your PM is notified.</p>
      </div>
    </form>
  )
}
