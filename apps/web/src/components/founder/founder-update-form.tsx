'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getPeriodOptions, suggestNextPeriod, formatMrr, formatCurrency, formatRunway } from '@fundos/shared'
import { submitFounderMonthlyUpdate, type FounderUpdateFormData } from '@/lib/founder-actions'
import type { FundraisingStatus } from '@fundos/types'

const STEPS = ['Metrics', 'Narrative', 'Review'] as const
type Step = 0 | 1 | 2

const FUNDRAISING_OPTIONS = [
  { value: 'NOT_RAISING', label: 'Not raising' },
  { value: 'EXPLORING', label: 'Exploring options' },
  { value: 'ACTIVELY_RAISING', label: 'Actively raising' },
  { value: 'TERM_SHEET', label: 'Term sheet received' },
  { value: 'CLOSED', label: 'Round closed' },
]

interface Props {
  filedPeriods: string[]
  prevMetrics: { mrr: number | null; burnRate: number | null; runway: number | null; headcount: number | null; revenueGrowthMom: number | null } | null
}

export function FounderUpdateForm({ filedPeriods, prevMetrics }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [step, setStep] = useState<Step>(0)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const suggestedPeriod = useMemo(() => suggestNextPeriod(filedPeriods), [filedPeriods])
  // getPeriodOptions returns plain strings ('YYYY-MM'), not { value, label } objects.
  const periodOptions = getPeriodOptions(6)
  const [period, setPeriod] = useState(suggestedPeriod)

  const [mrr, setMrr] = useState('')
  const [burnRate, setBurnRate] = useState('')
  const [cashBalance, setCashBalance] = useState('')
  const [headcount, setHeadcount] = useState('')

  const [wins, setWins] = useState('')
  const [risks, setRisks] = useState('')
  const [fundraisingStatus, setFundraisingStatus] = useState<FundraisingStatus>('NOT_RAISING')
  const [fundraisingNote, setFundraisingNote] = useState('')
  const [hiringNeeds, setHiringNeeds] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  const mrrNum = mrr ? parseFloat(mrr) : null
  const burnNum = burnRate ? parseFloat(burnRate) : null
  const cashNum = cashBalance ? parseFloat(cashBalance) : null
  const computedRunway = cashNum != null && burnNum != null && burnNum > 0 ? cashNum / burnNum : null
  const momGrowth = mrrNum != null && prevMetrics?.mrr != null && prevMetrics.mrr > 0
    ? (mrrNum - prevMetrics.mrr) / prevMetrics.mrr : null

  function validateStep(s: Step): Record<string, string> {
    const e: Record<string, string> = {}
    if (s === 0) {
      if (!period) e.period = 'Select a period'
    }
    if (s === 1) {
      if (!wins.trim()) e.wins = 'Describe your wins this month'
      if (!risks.trim()) e.risks = 'Describe challenges or risks'
    }
    return e
  }

  function next() {
    const e = validateStep(step)
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setStep((s) => Math.min(s + 1, 2) as Step)
  }

  function back() {
    setErrors({})
    setStep((s) => Math.max(s - 1, 0) as Step)
  }

  async function submit() {
    const data: FounderUpdateFormData = {
      period,
      mrr: mrrNum,
      burnRate: burnNum,
      cashBalance: cashNum,
      headcount: headcount ? parseInt(headcount, 10) : null,
      fundraisingStatus,
      fundraisingNote,
      wins,
      risks,
      hiringNeeds,
      additionalNotes,
    }

    startTransition(async () => {
      const result = await submitFounderMonthlyUpdate(data)
      if (result.success) setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-emerald-400 text-lg">✓</span>
        </div>
        <h2 className="text-lg font-semibold mb-2">Update submitted</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your investors have been notified. AI analysis is running in the background.
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
    <div className="rounded-lg border border-border bg-card">
      {/* Step indicator */}
      <div className="flex items-center gap-0 border-b border-border">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i < step ? setStep(i as Step) : undefined}
            className={`flex-1 py-3 text-[11px] font-medium text-center transition-colors ${
              i === step ? 'text-foreground border-b-2 border-primary -mb-px' :
              i < step ? 'text-muted-foreground hover:text-foreground' :
              'text-muted-foreground/40 cursor-default'
            }`}
          >
            {i < step ? '✓ ' : ''}{s}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-4">
        {step === 0 && (
          <>
            <Field label="Period *" error={errors.period}>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="input"
              >
                {periodOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}{p === suggestedPeriod ? ' (suggested)' : ''}
                    {filedPeriods.includes(p) ? ' (filed)' : ''}
                  </option>
                ))}
              </select>
            </Field>

            {prevMetrics && (
              <div className="rounded-md bg-secondary/30 border border-border p-3">
                <p className="text-[11px] font-medium text-muted-foreground mb-2">Previous period reference</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">MRR</p>
                    <p className="text-[12px] font-semibold">{prevMetrics.mrr != null ? formatMrr(prevMetrics.mrr) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Burn</p>
                    <p className="text-[12px] font-semibold">{prevMetrics.burnRate != null ? formatCurrency(prevMetrics.burnRate) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Runway</p>
                    <p className="text-[12px] font-semibold">{prevMetrics.runway != null ? formatRunway(prevMetrics.runway) : '—'}</p>
                  </div>
                </div>
              </div>
            )}

            <Field label="MRR (USD)">
              <input type="number" value={mrr} onChange={(e) => setMrr(e.target.value)} className="input" placeholder="e.g. 250000" min="0" />
              {momGrowth != null && (
                <p className={`text-[11px] mt-1 ${momGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  MoM growth: {momGrowth >= 0 ? '+' : ''}{(momGrowth * 100).toFixed(1)}%
                </p>
              )}
            </Field>
            <Field label="Monthly Burn (USD)">
              <input type="number" value={burnRate} onChange={(e) => setBurnRate(e.target.value)} className="input" placeholder="e.g. 180000" min="0" />
            </Field>
            <Field label="Cash Balance (USD)">
              <input type="number" value={cashBalance} onChange={(e) => setCashBalance(e.target.value)} className="input" placeholder="e.g. 3600000" min="0" />
              {computedRunway != null && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Runway: ~{formatRunway(computedRunway)}
                </p>
              )}
            </Field>
            <Field label="Headcount">
              <input type="number" value={headcount} onChange={(e) => setHeadcount(e.target.value)} className="input" placeholder="e.g. 24" min="0" />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Wins this month *" error={errors.wins}>
              <textarea
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                className="input min-h-[100px] resize-none"
                placeholder="Key milestones, customer wins, product launches, partnerships…"
              />
            </Field>
            <Field label="Challenges & risks *" error={errors.risks}>
              <textarea
                value={risks}
                onChange={(e) => setRisks(e.target.value)}
                className="input min-h-[100px] resize-none"
                placeholder="Obstacles you're navigating, risks you see, support you need…"
              />
            </Field>
            <Field label="Fundraising status">
              <select
                value={fundraisingStatus}
                onChange={(e) => setFundraisingStatus(e.target.value as FundraisingStatus)}
                className="input"
              >
                {FUNDRAISING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            {fundraisingStatus !== 'NOT_RAISING' && (
              <Field label="Fundraising details">
                <textarea
                  value={fundraisingNote}
                  onChange={(e) => setFundraisingNote(e.target.value)}
                  className="input min-h-[70px] resize-none"
                  placeholder="Round size, timeline, investor interest…"
                />
              </Field>
            )}
            <Field label="Hiring needs (optional)">
              <textarea
                value={hiringNeeds}
                onChange={(e) => setHiringNeeds(e.target.value)}
                className="input min-h-[70px] resize-none"
                placeholder="Roles you're hiring for, timeline, ideal profiles…"
              />
            </Field>
            <Field label="Additional notes (optional)">
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="input min-h-[70px] resize-none"
                placeholder="Anything else you want your investors to know…"
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Review your update before submitting.</p>
            <ReviewRow label="Period" value={period} />
            <ReviewRow label="MRR" value={mrrNum != null ? formatMrr(mrrNum) : 'Not provided'} />
            <ReviewRow label="Monthly Burn" value={burnNum != null ? formatCurrency(burnNum) : 'Not provided'} />
            <ReviewRow label="Runway" value={computedRunway != null ? formatRunway(computedRunway) : 'Not provided'} />
            <ReviewRow label="Fundraising" value={FUNDRAISING_OPTIONS.find((o) => o.value === fundraisingStatus)?.label ?? fundraisingStatus} />
            <div className="pt-2 border-t border-border">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Wins</p>
              <p className="text-[12px] text-foreground whitespace-pre-wrap">{wins}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Challenges</p>
              <p className="text-[12px] text-foreground whitespace-pre-wrap">{risks}</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-6 pb-6 gap-2">
        {step > 0 ? (
          <button onClick={back} className="h-8 px-4 rounded-md text-[12px] border border-border hover:bg-secondary/50 transition-colors">
            Back
          </button>
        ) : <div />}
        {step < 2 ? (
          <button onClick={next} className="h-8 px-4 rounded-md text-[12px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            Next
          </button>
        ) : (
          <button onClick={submit} className="h-8 px-4 rounded-md text-[12px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            Submit Update
          </button>
        )}
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-foreground mb-1">{label}</label>
      {children}
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/50">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[12px] font-medium">{value}</span>
    </div>
  )
}
