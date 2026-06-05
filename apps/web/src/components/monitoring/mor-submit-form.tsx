'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitMOR } from '@/lib/monitoring-actions'

interface Company { id: string; name: string; slug: string }

interface Props { companies: Company[] }

function NumInput({ label, name, value, onChange, prefix = '$', placeholder = '0' }: {
  label: string; name: string; value: string; onChange: (v: string) => void
  prefix?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] text-muted-foreground mb-1">{label}</label>
      <div className="flex items-center rounded-md border border-border bg-background overflow-hidden">
        {prefix && <span className="px-2.5 text-[11px] text-muted-foreground border-r border-border">{prefix}</span>}
        <input
          name={name}
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-2.5 py-2 text-[12px] bg-transparent text-foreground outline-none"
        />
      </div>
    </div>
  )
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

export function MORSubmitForm({ companies }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [companyId, setCompanyId] = useState('')
  const now = new Date()
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [period, setPeriod] = useState(defaultPeriod)

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
    { label: 'MRR', actual: '', target: '' },
    { label: 'NRR', actual: '', target: '' },
    { label: 'CAC Payback (months)', actual: '', target: '' },
    { label: 'Gross Margin %', actual: '', target: '' },
    { label: 'Pipeline Coverage', actual: '', target: '' },
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

  // Derived display
  const totalRevenue = (parseFloat(revSub) || 0) + (parseFloat(revSvc) || 0) + (parseFloat(revOther) || 0)
  const grossProfit = totalRevenue - (parseFloat(cogs) || 0)
  const ebitda = grossProfit - (parseFloat(smExp) || 0) - (parseFloat(rdExp) || 0) - (parseFloat(gaExp) || 0)
  const runway = (parseFloat(cashBalance) || 0) > 0 && (parseFloat(burnRate) || 0) > 0
    ? (parseFloat(cashBalance) / parseFloat(burnRate)).toFixed(1)
    : null

  const [submitError, setSubmitError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) return
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      setSubmitError('Period must be in YYYY-MM format')
      return
    }
    setSubmitError('')
    setSubmitting(true)

    const n = (v: string) => { const x = parseFloat(v); return Number.isFinite(x) ? x : null }

    try {
      await submitMOR({
        companyId, period,
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
        kpi1Label: kpis[0]?.label, kpi1Actual: n(kpis[0]?.actual ?? ''), kpi1Target: n(kpis[0]?.target ?? ''),
        kpi2Label: kpis[1]?.label, kpi2Actual: n(kpis[1]?.actual ?? ''), kpi2Target: n(kpis[1]?.target ?? ''),
        kpi3Label: kpis[2]?.label, kpi3Actual: n(kpis[2]?.actual ?? ''), kpi3Target: n(kpis[2]?.target ?? ''),
        kpi4Label: kpis[3]?.label, kpi4Actual: n(kpis[3]?.actual ?? ''), kpi4Target: n(kpis[3]?.target ?? ''),
        kpi5Label: kpis[4]?.label, kpi5Actual: n(kpis[4]?.actual ?? ''), kpi5Target: n(kpis[4]?.target ?? ''),
        wins, misses, pivots, nextMonthPriorities, okrs, founderNotes,
        attachmentUrl: attachmentUrl || null,
        attachmentLabel: attachmentLabel || null,
      })
      router.push('/monitoring')
    } catch (err) {
      console.error('Failed to submit MOR:', err)
      setSubmitError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Meta */}
      <Section title="Report Info">
        <TwoCol>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Portfolio Company *</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              required
              className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground"
            >
              <option value="">Select company...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Report Period *</label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              required
              className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground"
            />
          </div>
        </TwoCol>
      </Section>

      {/* P&L Actuals */}
      <Section title="P&L Actuals (Month)">
        <ThreeCol>
          <NumInput label="Subscription Revenue" name="revSub" value={revSub} onChange={setRevSub} />
          <NumInput label="Services Revenue" name="revSvc" value={revSvc} onChange={setRevSvc} />
          <NumInput label="Other Revenue" name="revOther" value={revOther} onChange={setRevOther} />
        </ThreeCol>
        <div className="px-3 py-2 rounded-md bg-secondary/30 text-[11px] text-muted-foreground">
          Total Revenue: <span className="font-semibold text-foreground">${totalRevenue.toLocaleString()}</span>
          {' · '}Gross Profit: <span className={grossProfit >= 0 ? 'font-semibold text-emerald-400' : 'font-semibold text-red-400'}>${grossProfit.toLocaleString()}</span>
          {' · '}EBITDA: <span className={ebitda >= 0 ? 'font-semibold text-emerald-400' : 'font-semibold text-red-400'}>${ebitda.toLocaleString()}</span>
        </div>
        <ThreeCol>
          <NumInput label="COGS" name="cogs" value={cogs} onChange={setCogs} />
          <NumInput label="S&M Expenses" name="smExp" value={smExp} onChange={setSmExp} />
          <NumInput label="R&D Expenses" name="rdExp" value={rdExp} onChange={setRdExp} />
        </ThreeCol>
        <TwoCol>
          <NumInput label="G&A Expenses" name="gaExp" value={gaExp} onChange={setGaExp} />
        </TwoCol>
      </Section>

      {/* vs Budget */}
      <Section title="vs Budget">
        <TwoCol>
          <NumInput label="Budget Revenue (month)" name="budgetRevenue" value={budgetRevenue} onChange={setBudgetRevenue} />
          <NumInput label="Budget EBITDA (month)" name="budgetEbitda" value={budgetEbitda} onChange={setBudgetEbitda} prefix="$" />
        </TwoCol>
        <TwoCol>
          <NumInput label="YTD Revenue Actual" name="ytdRevenue" value={ytdRevenue} onChange={setYtdRevenue} />
          <NumInput label="YTD Revenue Budget" name="ytdBudgetRevenue" value={ytdBudgetRevenue} onChange={setYtdBudgetRevenue} />
        </TwoCol>
        <TwoCol>
          <NumInput label="YTD EBITDA Actual" name="ytdEbitda" value={ytdEbitda} onChange={setYtdEbitda} />
          <NumInput label="YTD EBITDA Budget" name="ytdBudgetEbitda" value={ytdBudgetEbitda} onChange={setYtdBudgetEbitda} />
        </TwoCol>
      </Section>

      {/* Cash & Burn */}
      <Section title="Cash Position & Burn">
        <ThreeCol>
          <NumInput label="Monthly Burn Rate" name="burnRate" value={burnRate} onChange={setBurnRate} />
          <NumInput label="Cash Balance" name="cashBalance" value={cashBalance} onChange={setCashBalance} />
          <NumInput label="Bank Balance" name="bankBalance" value={bankBalance} onChange={setBankBalance} />
        </ThreeCol>
        {runway && (
          <div className={`px-3 py-2 rounded-md text-[11px] font-medium ${parseFloat(runway) < 6 ? 'bg-red-500/10 text-red-400' : parseFloat(runway) < 12 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            Computed Runway: {runway} months
            {parseFloat(runway) < 6 ? ' ⚠ CRITICAL — will trigger emergency escalation' : parseFloat(runway) < 12 ? ' — monitoring required' : ' — healthy'}
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
            <label className="block text-[11px] text-muted-foreground mb-1">Attrition (departures)</label>
            <input type="number" value={attrition} onChange={(e) => setAttrition(e.target.value)} placeholder="0" className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground" />
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Open Roles</label>
            <input type="number" value={openRoles} onChange={(e) => setOpenRoles(e.target.value)} placeholder="0" className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground" />
          </div>
        </ThreeCol>
      </Section>

      {/* KPI Dashboard */}
      <Section title="KPI Dashboard — 5 Core Metrics">
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide px-1 mb-1">
          <span>Metric</span><span>Actual</span><span>Target</span>
        </div>
        {kpis.map((kpi, i) => (
          <div key={i} className="grid grid-cols-[2fr_1fr_1fr] gap-2 items-center">
            <input
              type="text"
              value={kpi.label}
              onChange={(e) => setKpis(kpis.map((k, j) => j === i ? { ...k, label: e.target.value } : k))}
              className="text-[12px] bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground"
              placeholder={`KPI ${i + 1}`}
            />
            <input
              type="number" step="any"
              value={kpi.actual}
              onChange={(e) => setKpis(kpis.map((k, j) => j === i ? { ...k, actual: e.target.value } : k))}
              className="text-[12px] bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground"
              placeholder="0"
            />
            <input
              type="number" step="any"
              value={kpi.target}
              onChange={(e) => setKpis(kpis.map((k, j) => j === i ? { ...k, target: e.target.value } : k))}
              className="text-[12px] bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground"
              placeholder="0"
            />
          </div>
        ))}
      </Section>

      {/* Qualitative */}
      <Section title="Qualitative Update">
        {[
          { label: 'Key Wins', value: wins, onChange: setWins, placeholder: 'Revenue milestones, product launches, new logos...' },
          { label: 'Key Misses & Challenges', value: misses, onChange: setMisses, placeholder: 'Pipeline slippage, missed targets, team gaps...' },
          { label: 'Pivots & Strategy Changes', value: pivots, onChange: setPivots, placeholder: 'GTM changes, product pivot, market repositioning...' },
          { label: 'Next Month Priorities', value: nextMonthPriorities, onChange: setNextMonthPriorities, placeholder: 'Top 3-5 priorities for next month...' },
          { label: 'OKRs', value: okrs, onChange: setOkrs, placeholder: 'Quarterly objectives and key results...' },
          { label: 'Additional Founder Notes', value: founderNotes, onChange: setFounderNotes, placeholder: 'Fundraising updates, board items, anything else...' },
        ].map(({ label, value, onChange, placeholder }) => (
          <div key={label}>
            <label className="block text-[11px] text-muted-foreground mb-1">{label}</label>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              placeholder={placeholder}
              className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground resize-y"
            />
          </div>
        ))}
      </Section>

      {/* Document Attachments */}
      <Section title="Document Attachments (Optional)">
        <p className="text-[11px] text-muted-foreground -mt-2">
          Paste a link to your PDF/Excel MOR document (Google Drive, Dropbox, SharePoint).
        </p>
        <TwoCol>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Document URL</label>
            <input
              type="url"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Label (optional)</label>
            <input
              type="text"
              value={attachmentLabel}
              onChange={(e) => setAttachmentLabel(e.target.value)}
              placeholder="e.g. May 2026 MOR.pdf"
              className="w-full text-[12px] bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </TwoCol>
      </Section>

      {submitError && <p className="text-[12px] text-red-400">{submitError}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || !companyId}
          className="h-9 px-5 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Submitting & analyzing...' : 'Submit MOR'}
        </button>
        <p className="text-[11px] text-muted-foreground">
          AI will automatically detect threshold breaches and generate escalation flags.
        </p>
      </div>
    </form>
  )
}
