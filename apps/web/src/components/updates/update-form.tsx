'use client'

import { useState, useTransition, useMemo, useEffect, useId, isValidElement, cloneElement, Children } from 'react'
import { useRouter } from 'next/navigation'
import { formatMrr, formatCurrency, formatRunway, formatGrowth, getPeriodOptions, suggestNextPeriod, sectorLabel } from '@fundos/shared'
import { submitFounderUpdate, type UpdateFormData } from '@/lib/update-actions'
import type { CompanyForForm } from '@/lib/updates'
import type { FundraisingStatus } from '@fundos/types'

interface UpdateFormProps {
  companies: CompanyForForm[]
  defaultCompanyId?: string
}

const STEPS = ['Metrics', 'Narrative', 'Review'] as const
type Step = 0 | 1 | 2

const FUNDRAISING_OPTIONS = [
  { value: 'NOT_RAISING', label: 'Not raising' },
  { value: 'EXPLORING', label: 'Exploring options' },
  { value: 'ACTIVELY_RAISING', label: 'Actively raising' },
  { value: 'TERM_SHEET', label: 'Term sheet received' },
  { value: 'CLOSED', label: 'Round closed' },
]

export function UpdateForm({ companies, defaultCompanyId }: UpdateFormProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [step, setStep] = useState<Step>(0)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [companyId, setCompanyId] = useState(defaultCompanyId ?? companies[0]?.id ?? '')
  const [period, setPeriod] = useState('')

  // Metrics
  const [mrr, setMrr] = useState('')
  const [burnRate, setBurnRate] = useState('')
  const [cashBalance, setCashBalance] = useState('')
  const [headcount, setHeadcount] = useState('')

  // Narrative
  const [wins, setWins] = useState('')
  const [risks, setRisks] = useState('')
  const [fundraisingStatus, setFundraisingStatus] = useState<FundraisingStatus>('NOT_RAISING')
  const [fundraisingNote, setFundraisingNote] = useState('')
  const [hiringNeeds, setHiringNeeds] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === companyId) ?? companies[0],
    [companies, companyId]
  )

  // Suggest the next period for the selected company
  const filedPeriods = useMemo(
    () => selectedCompany?.updates.map((u) => u.period) ?? [],
    [selectedCompany]
  )
  const suggestedPeriod = useMemo(() => suggestNextPeriod(filedPeriods), [filedPeriods])
  const periodOptions = getPeriodOptions(6)

  // Initialise period when company changes
  useEffect(() => {
    setPeriod(suggestedPeriod)
  }, [suggestedPeriod])

  // Reference metrics from previous period
  const prevMetrics = selectedCompany?.metrics[0] ?? null

  // Auto-computed values
  const mrrNum = mrr ? parseFloat(mrr) : null
  const burnNum = burnRate ? parseFloat(burnRate) : null
  const cashNum = cashBalance ? parseFloat(cashBalance) : null
  const headcountNum = headcount ? parseInt(headcount, 10) : null
  const computedRunway = cashNum != null && burnNum != null && burnNum > 0
    ? cashNum / burnNum : null
  const momGrowth = mrrNum != null && prevMetrics?.mrr != null && prevMetrics.mrr > 0
    ? (mrrNum - prevMetrics.mrr) / prevMetrics.mrr : null

  function validateStep(s: Step): boolean {
    const errs: Record<string, string> = {}
    if (s === 0) {
      if (!companyId) errs.companyId = 'Select a company'
      if (!period) errs.period = 'Select a period'
    }
    if (s === 1) {
      if (!wins.trim()) errs.wins = 'Describe at least one win'
      if (!risks.trim()) errs.risks = 'Describe at least one risk or challenge'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleNext() {
    if (!validateStep(step)) return
    setStep((s) => (s < 2 ? (s + 1) as Step : s))
  }

  function handleBack() {
    setStep((s) => (s > 0 ? (s - 1) as Step : s))
    setErrors({})
  }

  function handleSubmit() {
    if (!validateStep(1)) { setStep(1); return }
    startTransition(async () => {
      const formData: UpdateFormData = {
        companyId,
        period,
        mrr: mrrNum,
        burnRate: burnNum,
        cashBalance: cashNum,
        headcount: headcountNum,
        fundraisingStatus,
        fundraisingNote,
        wins,
        risks,
        hiringNeeds,
        additionalNotes,
      }
      await submitFounderUpdate(formData)
      setSubmitted(true)
    })
  }

  if (submitted) {
    return <SuccessScreen companyName={selectedCompany?.name ?? ''} period={period} onDone={() => router.push('/updates')} />
  }

  return (
    <div className="max-w-xl">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                i < step ? 'bg-primary/20 text-primary' :
                i === step ? 'bg-primary text-primary-foreground' :
                'bg-secondary text-muted-foreground'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`ml-1.5 text-[12px] font-medium ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>
              {label}
            </span>
            {i < 2 && <span className="mx-3 text-muted-foreground/30">›</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Metrics */}
      {step === 0 && (
        <div className="space-y-4">
          <Field label="Company" error={errors.companyId}>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="input w-full"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({sectorLabel(c.sector)})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Reporting Period" error={errors.period}>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input w-full">
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  {p}{p === suggestedPeriod ? ' (suggested)' : ''}{filedPeriods.includes(p) ? ' — already filed' : ''}
                </option>
              ))}
            </select>
          </Field>

          {/* Reference row */}
          {prevMetrics && (
            <div className="rounded-md border border-border/50 bg-secondary/20 px-3.5 py-2.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Previous period reference ({prevMetrics.period})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'MRR', value: formatMrr(prevMetrics.mrr) },
                  { label: 'Burn', value: prevMetrics.burnRate ? formatCurrency(prevMetrics.burnRate, true) : '—' },
                  { label: 'Cash', value: prevMetrics.cashBalance ? formatCurrency(prevMetrics.cashBalance, true) : '—' },
                  { label: 'Headcount', value: prevMetrics.headcount != null ? String(prevMetrics.headcount) : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className="text-[12px] font-medium tabular-nums text-muted-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly Revenue (MRR)" hint="$">
              <input
                type="number"
                min="0"
                placeholder={prevMetrics?.mrr ? String(Math.round(prevMetrics.mrr)) : '0'}
                value={mrr}
                onChange={(e) => setMrr(e.target.value)}
                className="input w-full"
              />
              {momGrowth != null && (
                <p className={`text-[11px] mt-1 ${momGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatGrowth(momGrowth)} vs prev period
                </p>
              )}
            </Field>

            <Field label="Monthly Burn Rate" hint="$">
              <input
                type="number"
                min="0"
                placeholder="0"
                value={burnRate}
                onChange={(e) => setBurnRate(e.target.value)}
                className="input w-full"
              />
            </Field>

            <Field label="Cash Balance" hint="$">
              <input
                type="number"
                min="0"
                placeholder="0"
                value={cashBalance}
                onChange={(e) => setCashBalance(e.target.value)}
                className="input w-full"
              />
              {computedRunway != null && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Runway: {formatRunway(computedRunway)} (auto-computed)
                </p>
              )}
            </Field>

            <Field label="Headcount">
              <input
                type="number"
                min="0"
                placeholder="0"
                value={headcount}
                onChange={(e) => setHeadcount(e.target.value)}
                className="input w-full"
              />
            </Field>
          </div>
        </div>
      )}

      {/* Step 2: Narrative */}
      {step === 1 && (
        <div className="space-y-4">
          <Field label="Wins this period *" error={errors.wins}>
            <textarea
              rows={4}
              placeholder="Describe your key wins, milestones, and achievements..."
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              className="input w-full resize-none"
            />
          </Field>

          <Field label="Risks & Challenges *" error={errors.risks}>
            <textarea
              rows={4}
              placeholder="What challenges are you facing? What keeps you up at night?"
              value={risks}
              onChange={(e) => setRisks(e.target.value)}
              className="input w-full resize-none"
            />
          </Field>

          <Field label="Fundraising Status">
            <select
              value={fundraisingStatus}
              onChange={(e) => setFundraisingStatus(e.target.value as FundraisingStatus)}
              className="input w-full"
            >
              {FUNDRAISING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          {fundraisingStatus !== 'NOT_RAISING' && (
            <Field label="Fundraising Note">
              <textarea
                rows={2}
                placeholder="Target amount, lead investors, timeline..."
                value={fundraisingNote}
                onChange={(e) => setFundraisingNote(e.target.value)}
                className="input w-full resize-none"
              />
            </Field>
          )}

          <Field label="Hiring Needs">
            <textarea
              rows={2}
              placeholder="Roles you're actively hiring for..."
              value={hiringNeeds}
              onChange={(e) => setHiringNeeds(e.target.value)}
              className="input w-full resize-none"
            />
          </Field>

          <Field label="Additional Notes">
            <textarea
              rows={2}
              placeholder="Anything else we should know..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="input w-full resize-none"
            />
          </Field>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <ReviewRow label="Company" value={selectedCompany?.name ?? '—'} />
            <ReviewRow label="Period" value={period} />
            <Divider />
            <ReviewRow label="MRR" value={mrrNum ? formatMrr(mrrNum) : '—'} />
            <ReviewRow label="Monthly Burn" value={burnNum ? formatCurrency(burnNum, true) : '—'} />
            <ReviewRow label="Cash Balance" value={cashNum ? formatCurrency(cashNum, true) : '—'} />
            <ReviewRow label="Runway" value={computedRunway ? formatRunway(computedRunway) : '—'} />
            <ReviewRow label="Headcount" value={headcountNum != null ? String(headcountNum) : '—'} />
            <ReviewRow label="MoM Growth" value={momGrowth != null ? formatGrowth(momGrowth) : '—'} />
            <Divider />
            <ReviewRow label="Fundraising" value={FUNDRAISING_OPTIONS.find((o) => o.value === fundraisingStatus)?.label ?? fundraisingStatus} />
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Wins</p>
              <p className="text-[12px] text-foreground line-clamp-2">{wins || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Risks</p>
              <p className="text-[12px] text-foreground line-clamp-2">{risks || '—'}</p>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">
            After submitting, AI analysis will run in the background and update the company&apos;s health score shortly.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-4 border-t border-border">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className="h-9 px-4 rounded-lg border border-border text-[13px] font-medium text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>
        {step < 2 ? (
          <button onClick={handleNext} className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors">
            Next →
          </button>
        ) : (
          <button onClick={handleSubmit} className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors">
            Submit Update
          </button>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode
}) {
  const id = useId()
  // Inject the generated id into the first child element (the form control)
  const childArray = Children.toArray(children)
  const control = childArray[0]
  const rest = childArray.slice(1)
  const controlWithId = isValidElement(control)
    ? cloneElement(control as React.ReactElement<{ id?: string }>, { id })
    : control

  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        <label htmlFor={id} className="text-[12px] font-medium text-muted-foreground">{label}</label>
        {hint && <span className="text-[11px] text-muted-foreground/50">({hint})</span>}
      </div>
      {controlWithId}
      {rest}
      {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-[12px] font-medium text-foreground tabular-nums">{value}</span>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-border/50" />
}

function SuccessScreen({ companyName, period, onDone }: { companyName: string; period: string; onDone: () => void }) {
  return (
    <div className="max-w-xl flex flex-col items-center text-center py-12">
      <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl mb-4">
        ✓
      </div>
      <h2 className="text-[15px] font-semibold text-foreground mb-2">Update Submitted</h2>
      <p className="text-[13px] text-muted-foreground mb-1">
        {companyName} · {period}
      </p>
      <p className="text-[12px] text-muted-foreground/70 mb-6">
        AI analysis is running in the background. The company&apos;s health score will update shortly.
      </p>
      <button
        onClick={onDone}
        className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors"
      >
        View Updates Inbox
      </button>
    </div>
  )
}
