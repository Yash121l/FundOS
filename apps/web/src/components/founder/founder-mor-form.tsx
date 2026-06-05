'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitFounderMOR } from '@/lib/founder-actions'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Clock, ExternalLink } from 'lucide-react'

interface Props {
  reportingPeriod: string   // "YYYY-MM"
  dueDate: Date
  daysUntilDue: number
  isOverdue: boolean
  isSubmitted: boolean
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <p className="text-[12px] font-semibold text-foreground">{title}</p>
      {children}
    </div>
  )
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
}

function ThreeCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{children}</div>
}

function NumInput({ label, value, onChange, prefix = '$', placeholder = '0', hint }: {
  label: string; value: string; onChange: (v: string) => void
  prefix?: string; placeholder?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-[11px] text-muted-foreground mb-1">{label}</label>
      <div className="flex items-center rounded-md border border-border bg-background overflow-hidden">
        {prefix && <span className="px-2.5 text-[11px] text-muted-foreground border-r border-border">{prefix}</span>}
        <input
          type="number" step="any" value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-2.5 py-2 text-[12px] bg-transparent text-foreground outline-none"
        />
      </div>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  )
}

export function FounderMORForm({
  reportingPeriod, dueDate, daysUntilDue, isOverdue, isSubmitted,
}: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // P&L
  const [revSub, setRevSub] = useState('')
  const [revSvc, setRevSvc] = useState('')
  const [revOther, setRevOther] = useState('')
  const [cogs, setCogs] = useState('')
  const [smExp, setSmExp] = useState('')
  const [rdExp, setRdExp] = useState('')
  const [gaExp, setGaExp] = useState('')

  // Budget
  const [budgetRevenue, setBudgetRevenue] = useState('')
  const [budgetEbitda, setBudgetEbitda] = useState('')

  // YTD
  const [ytdRevenue, setYtdRevenue] = useState('')
  const [ytdEbitda, setYtdEbitda] = useState('')
  const [ytdBudgetRevenue, setYtdBudgetRevenue] = useState('')
  const [ytdBudgetEbitda, setYtdBudgetEbitda] = useState('')

  // Cash
  const [burnRate, setBurnRate] = useState('')
  const [cashBalance, setCashBalance] = useState('')
  const [bankBalance, setBankBalance] = useState('')

  // Headcount
  const [headcount, setHeadcount] = useState('')
  const [attrition, setAttrition] = useState('')
  const [openRoles, setOpenRoles] = useState('')

  // KPIs
  const [kpis, setKpis] = useState([
    { label: 'MRR', value: '' },
    { label: 'NRR / Net Revenue Retention', value: '' },
    { label: 'CAC Payback (months)', value: '' },
    { label: 'Gross Margin %', value: '' },
    { label: 'Pipeline Coverage', value: '' },
  ])

  // Qualitative
  const [wins, setWins] = useState('')
  const [misses, setMisses] = useState('')
  const [pivots, setPivots] = useState('')
  const [nextMonthPriorities, setNextMonthPriorities] = useState('')
  const [okrs, setOkrs] = useState('')
  const [founderNotes, setFounderNotes] = useState('')

  // Attachment
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [attachmentLabel, setAttachmentLabel] = useState('')

  const totalRevenue = (parseFloat(revSub) || 0) + (parseFloat(revSvc) || 0) + (parseFloat(revOther) || 0)
  const grossProfit = totalRevenue - (parseFloat(cogs) || 0)
  const ebitda = grossProfit - (parseFloat(smExp) || 0) - (parseFloat(rdExp) || 0) - (parseFloat(gaExp) || 0)
  const runway = (parseFloat(cashBalance) || 0) > 0 && (parseFloat(burnRate) || 0) > 0
    ? (parseFloat(cashBalance) / parseFloat(burnRate)).toFixed(1)
    : null

  const n = (v: string) => { if (!v) return null; const parsed = parseFloat(v.trim()); return Number.isFinite(parsed) ? parsed : null }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitting(true)
    try {
      await submitFounderMOR({
        period: reportingPeriod,
        revenueSubscription: n(revSub),
        revenueServices: n(revSvc),
        revenueOther: n(revOther),
        cogs: n(cogs),
        smExpenses: n(smExp),
        rdExpenses: n(rdExp),
        gaExpenses: n(gaExp),
        budgetRevenue: n(budgetRevenue),
        budgetEbitda: n(budgetEbitda),
        ytdRevenue: n(ytdRevenue),
        ytdEbitda: n(ytdEbitda),
        ytdBudgetRevenue: n(ytdBudgetRevenue),
        ytdBudgetEbitda: n(ytdBudgetEbitda),
        burnRate: n(burnRate),
        cashBalance: n(cashBalance),
        bankBalance: n(bankBalance),
        headcount: headcount ? parseInt(headcount, 10) : null,
        attrition: attrition ? parseInt(attrition, 10) : null,
        openRoles: openRoles ? parseInt(openRoles, 10) : null,
        kpi1Label: kpis[0]?.label, kpi1Actual: n(kpis[0]?.value ?? ''), kpi1Target: null,
        kpi2Label: kpis[1]?.label, kpi2Actual: n(kpis[1]?.value ?? ''), kpi2Target: null,
        kpi3Label: kpis[2]?.label, kpi3Actual: n(kpis[2]?.value ?? ''), kpi3Target: null,
        kpi4Label: kpis[3]?.label, kpi4Actual: n(kpis[3]?.value ?? ''), kpi4Target: null,
        kpi5Label: kpis[4]?.label, kpi5Actual: n(kpis[4]?.value ?? ''), kpi5Target: null,
        wins, misses, pivots, nextMonthPriorities, okrs, founderNotes,
        attachmentUrl: attachmentUrl || null,
        attachmentLabel: attachmentLabel || null,
      })
      setSubmitted(true)
    } catch (err) {
      console.error('Failed to submit MOR:', err)
      setSubmitError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
        <CheckCircle size={32} className="mx-auto text-emerald-400 mb-3" />
        <h2 className="text-[15px] font-semibold mb-1">MOR Submitted</h2>
        <p className="text-[12px] text-muted-foreground mb-4">
          Your {reportingPeriod} Monthly Operations Report has been received. Your Portfolio Manager will review it within 5 business days.
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
      {/* Deadline banner */}
      <div className={cn(
        'rounded-xl border p-4 flex items-start gap-3',
        isOverdue
          ? 'border-red-500/20 bg-red-500/5'
          : daysUntilDue <= 5
            ? 'border-amber-500/20 bg-amber-500/5'
            : 'border-border bg-card'
      )}>
        {isOverdue
          ? <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          : daysUntilDue <= 5
            ? <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            : <Clock size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
        }
        <div>
          <p className={cn(
            'text-[12px] font-semibold',
            isOverdue ? 'text-red-400' : daysUntilDue <= 5 ? 'text-amber-400' : 'text-foreground'
          )}>
            {isOverdue
              ? `OVERDUE — ${reportingPeriod} MOR was due ${dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
              : isSubmitted
                ? `${reportingPeriod} MOR — Already submitted`
                : daysUntilDue === 0
                  ? `${reportingPeriod} MOR — Due TODAY`
                  : `${reportingPeriod} MOR — Due ${dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} (${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} remaining)`
            }
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Cover: P&L actuals vs budget · Revenue, GM, EBITDA · Burn rate & runway · KPI dashboard · Team headcount · Key wins, misses & pivots · Next month priorities
          </p>
        </div>
      </div>

      {/* P&L Actuals */}
      <Section title={`P&L Actuals — ${reportingPeriod}`}>
        <ThreeCol>
          <NumInput label="Subscription Revenue" value={revSub} onChange={setRevSub} />
          <NumInput label="Services Revenue" value={revSvc} onChange={setRevSvc} />
          <NumInput label="Other Revenue" value={revOther} onChange={setRevOther} />
        </ThreeCol>
        {totalRevenue > 0 && (
          <div className="px-3 py-2 rounded-md bg-secondary/30 text-[11px] text-muted-foreground">
            Total Revenue: <span className="font-semibold text-foreground">${totalRevenue.toLocaleString()}</span>
            {' · '}Gross Profit: <span className={grossProfit >= 0 ? 'font-semibold text-emerald-400' : 'font-semibold text-red-400'}>${grossProfit.toLocaleString()}</span>
            {' · '}EBITDA: <span className={ebitda >= 0 ? 'font-semibold text-emerald-400' : 'font-semibold text-red-400'}>${ebitda.toLocaleString()}</span>
          </div>
        )}
        <ThreeCol>
          <NumInput label="COGS" value={cogs} onChange={setCogs} />
          <NumInput label="S&M Expenses" value={smExp} onChange={setSmExp} />
          <NumInput label="R&D Expenses" value={rdExp} onChange={setRdExp} />
        </ThreeCol>
        <TwoCol>
          <NumInput label="G&A Expenses" value={gaExp} onChange={setGaExp} />
        </TwoCol>
      </Section>

      {/* vs Budget */}
      <Section title="vs Budget">
        <TwoCol>
          <NumInput label="Budget Revenue (month)" value={budgetRevenue} onChange={setBudgetRevenue} />
          <NumInput label="Budget EBITDA (month)" value={budgetEbitda} onChange={setBudgetEbitda} />
        </TwoCol>
        <TwoCol>
          <NumInput label="YTD Revenue Actual" value={ytdRevenue} onChange={setYtdRevenue} />
          <NumInput label="YTD Revenue Budget" value={ytdBudgetRevenue} onChange={setYtdBudgetRevenue} />
        </TwoCol>
        <TwoCol>
          <NumInput label="YTD EBITDA Actual" value={ytdEbitda} onChange={setYtdEbitda} />
          <NumInput label="YTD EBITDA Budget" value={ytdBudgetEbitda} onChange={setYtdBudgetEbitda} />
        </TwoCol>
      </Section>

      {/* Cash & Burn */}
      <Section title="Cash Position & Burn Rate">
        <ThreeCol>
          <NumInput
            label="Monthly Burn Rate"
            value={burnRate}
            onChange={setBurnRate}
            hint="Total cash out per month"
          />
          <NumInput
            label="Cash Balance"
            value={cashBalance}
            onChange={setCashBalance}
            hint="All accounts combined"
          />
          <NumInput
            label="Bank Balance"
            value={bankBalance}
            onChange={setBankBalance}
            hint="Primary operating account"
          />
        </ThreeCol>
        {runway && (
          <div className={cn(
            'px-3 py-2 rounded-md text-[11px] font-medium',
            parseFloat(runway) < 6 ? 'bg-red-500/10 text-red-400' :
            parseFloat(runway) < 12 ? 'bg-amber-500/10 text-amber-400' :
            'bg-emerald-500/10 text-emerald-400'
          )}>
            Runway: {runway} months
            {parseFloat(runway) < 6 && ' ⚠ CRITICAL — this will trigger an emergency escalation to your board'}
            {parseFloat(runway) >= 6 && parseFloat(runway) < 12 && ' — will be flagged for monitoring'}
          </div>
        )}
      </Section>

      {/* Headcount */}
      <Section title="Team & Headcount">
        <ThreeCol>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Total Headcount</label>
            <input type="number" value={headcount} onChange={(e) => setHeadcount(e.target.value)} placeholder="0" className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground" />
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Attrition this month</label>
            <input type="number" value={attrition} onChange={(e) => setAttrition(e.target.value)} placeholder="0" className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground" />
            <p className="text-[10px] text-muted-foreground mt-0.5">Key departures must be disclosed immediately</p>
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Open Roles</label>
            <input type="number" value={openRoles} onChange={(e) => setOpenRoles(e.target.value)} placeholder="0" className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground" />
          </div>
        </ThreeCol>
      </Section>

      {/* KPI Dashboard */}
      <Section title="KPI Dashboard — 5 Core Metrics">
        <p className="text-[11px] text-muted-foreground -mt-2">Track your 5 most important metrics vs last month. Edit the metric labels as needed for your business.</p>
        <div className="grid grid-cols-[2fr_1fr] gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide px-1 mb-1">
          <span>Metric</span><span>This Month</span>
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
      </Section>

      {/* Qualitative */}
      <Section title="Narrative Update">
        {([
          { label: 'Key Wins *', value: wins, onChange: setWins, placeholder: 'Revenue milestones, new logos, product launches, partnerships signed…', required: true },
          { label: 'Key Misses & Challenges *', value: misses, onChange: setMisses, placeholder: 'Pipeline slippage, missed targets, churn, team gaps, market headwinds…', required: true },
          { label: 'Pivots or Strategy Changes', value: pivots, onChange: setPivots, placeholder: 'GTM changes, product pivot, market repositioning, pricing changes…', required: false },
          { label: 'Next Month Priorities *', value: nextMonthPriorities, onChange: setNextMonthPriorities, placeholder: 'Top 3–5 priorities with owners and expected outcomes…', required: true },
          { label: 'OKRs — Quarter Progress', value: okrs, onChange: setOkrs, placeholder: 'Objectives and key results for the current quarter, % completion…', required: false },
          { label: 'Additional Notes to Investors', value: founderNotes, onChange: setFounderNotes, placeholder: 'Fundraising update, upcoming board items, ask for intros or support…', required: false },
        ] as Array<{ label: string; value: string; onChange: (v: string) => void; placeholder: string; required: boolean }>).map(({ label, value, onChange, placeholder, required }) => (
          <div key={label}>
            <label className="block text-[11px] text-muted-foreground mb-1">{label}</label>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              placeholder={placeholder}
              required={required}
              className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground resize-y"
            />
          </div>
        ))}
      </Section>

      {/* Document Attachment */}
      <Section title="Document Attachment (Optional)">
        <p className="text-[11px] text-muted-foreground -mt-2">
          Paste a link to your PDF or Excel MOR document (Google Drive, Dropbox, SharePoint, etc.). This is in addition to the data entered above.
        </p>
        <TwoCol>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Document Link</label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://drive.google.com/…"
                className="flex-1 text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground"
              />
              {attachmentUrl && (
                <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} className="text-muted-foreground hover:text-foreground" />
                </a>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">File Name / Label</label>
            <input
              type="text"
              value={attachmentLabel}
              onChange={(e) => setAttachmentLabel(e.target.value)}
              placeholder={`${reportingPeriod} MOR.pdf`}
              className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </TwoCol>
      </Section>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={submitting}
          className="h-9 px-5 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Submitting…' : `Submit ${reportingPeriod} MOR`}
        </button>
        <p className="text-[11px] text-muted-foreground">
          AI checks will run automatically. Threshold breaches trigger escalation flags to your Portfolio Manager.
        </p>
      </div>
      {submitError && (
        <p className="text-[12px] text-red-400">{submitError}</p>
      )}
    </form>
  )
}
