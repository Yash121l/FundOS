'use client'

import { useState, useTransition } from 'react'
import { saveFundProfile } from '@/lib/fund-actions'
import { formatDate } from '@fundos/shared'
import { cn } from '@/lib/utils'

interface FundProfile {
  id: string; name: string; vintage: number; committedCapital: number
  managementFeePct: number; carryPct: number; hurdleRate: number
  waterfallType: string; currency: string
  investmentPeriodEnd: Date | null; fundTermEnd: Date | null
}

interface Props {
  fund: FundProfile | null
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/50">{hint}</p>}
    </div>
  )
}

function fmtDate(d: Date | null) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function FundTab({ fund }: Props) {
  const [editing, setEditing] = useState(!fund)
  const [pending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: fund?.name ?? 'Fund I',
    vintage: String(fund?.vintage ?? new Date().getFullYear()),
    committedCapital: String(fund?.committedCapital ?? ''),
    managementFeePct: String((fund?.managementFeePct ?? 0.02) * 100),
    carryPct: String((fund?.carryPct ?? 0.20) * 100),
    hurdleRate: String((fund?.hurdleRate ?? 0.08) * 100),
    waterfallType: fund?.waterfallType ?? 'EUROPEAN',
    currency: fund?.currency ?? 'USD',
    investmentPeriodEnd: fmtDate(fund?.investmentPeriodEnd ?? null),
    fundTermEnd: fmtDate(fund?.fundTermEnd ?? null),
  })

  function s<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    setSuccess(false)
    setError('')
  }

  function handleSave() {
    if (!form.name) { setError('Fund name is required.'); return }
    const committed = parseFloat(form.committedCapital)
    const managementFee = parseFloat(form.managementFeePct)
    const carry = parseFloat(form.carryPct)
    const hurdle = parseFloat(form.hurdleRate)
    if (!Number.isFinite(committed) || form.committedCapital === '') { setError('Committed capital must be a valid number.'); return }
    if (!Number.isFinite(managementFee)) { setError('Management fee must be a valid number.'); return }
    if (!Number.isFinite(carry)) { setError('Carried interest must be a valid number.'); return }
    if (!Number.isFinite(hurdle)) { setError('Hurdle rate must be a valid number.'); return }
    startTransition(async () => {
      const res = await saveFundProfile({
        name: form.name,
        vintage: parseInt(form.vintage, 10) || new Date().getFullYear(),
        committedCapital: committed,
        managementFeePct: managementFee / 100,
        carryPct: carry / 100,
        hurdleRate: hurdle / 100,
        waterfallType: form.waterfallType,
        investmentPeriodEnd: form.investmentPeriodEnd || null,
        fundTermEnd: form.fundTermEnd || null,
        currency: form.currency,
      })
      if (res.success) { setSuccess(true); setEditing(false) }
      else setError('Failed to save fund profile.')
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Fund Configuration</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Core fund parameters used for performance calculations and LP reporting.
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="h-8 px-3 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {!editing && fund ? (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {[
            { label: 'Fund Name', value: fund.name },
            { label: 'Vintage Year', value: fund.vintage },
            { label: 'Committed Capital', value: `$${(fund.committedCapital / 1_000_000).toFixed(0)}M ${fund.currency}` },
            { label: 'Management Fee', value: `${(fund.managementFeePct * 100).toFixed(1)}%` },
            { label: 'Carried Interest', value: `${(fund.carryPct * 100).toFixed(0)}%` },
            { label: 'Hurdle Rate', value: `${(fund.hurdleRate * 100).toFixed(0)}%` },
            { label: 'Waterfall Type', value: fund.waterfallType },
            { label: 'Investment Period End', value: fund.investmentPeriodEnd ? formatDate(fund.investmentPeriodEnd) : '—' },
            { label: 'Fund Term End', value: fund.fundTermEnd ? formatDate(fund.fundTermEnd) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[12px] text-muted-foreground">{label}</span>
              <span className="text-[13px] font-medium">{value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fund Name *">
              <input type="text" value={form.name} onChange={(e) => s('name', e.target.value)} className="input w-full" placeholder="RTP Global Fund III" />
            </Field>
            <Field label="Vintage Year">
              <input type="number" value={form.vintage} onChange={(e) => s('vintage', e.target.value)} className="input w-full" placeholder="2021" />
            </Field>
            <Field label="Committed Capital ($) *">
              <input type="number" value={form.committedCapital} onChange={(e) => s('committedCapital', e.target.value)} className="input w-full" placeholder="400000000" />
            </Field>
            <Field label="Currency">
              <select value={form.currency} onChange={(e) => s('currency', e.target.value)} className="input w-full">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </Field>
            <Field label="Management Fee (%)" hint="Annual as % of committed capital">
              <input type="number" step="0.1" value={form.managementFeePct} onChange={(e) => s('managementFeePct', e.target.value)} className="input w-full" placeholder="2" />
            </Field>
            <Field label="Carried Interest (%)">
              <input type="number" value={form.carryPct} onChange={(e) => s('carryPct', e.target.value)} className="input w-full" placeholder="20" />
            </Field>
            <Field label="Hurdle Rate (%)">
              <input type="number" value={form.hurdleRate} onChange={(e) => s('hurdleRate', e.target.value)} className="input w-full" placeholder="8" />
            </Field>
            <Field label="Waterfall Type">
              <select value={form.waterfallType} onChange={(e) => s('waterfallType', e.target.value)} className="input w-full">
                <option value="EUROPEAN">European (whole-fund)</option>
                <option value="AMERICAN">American (deal-by-deal)</option>
              </select>
            </Field>
            <Field label="Investment Period End">
              <input type="date" value={form.investmentPeriodEnd} onChange={(e) => s('investmentPeriodEnd', e.target.value)} className="input w-full" />
            </Field>
            <Field label="Fund Term End">
              <input type="date" value={form.fundTermEnd} onChange={(e) => s('fundTermEnd', e.target.value)} className="input w-full" />
            </Field>
          </div>

          {error && <p className="text-[12px] text-red-400">{error}</p>}
          {success && <p className="text-[12px] text-emerald-400">✓ Fund profile saved.</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}>
              {pending ? 'Saving…' : 'Save Fund Profile'}
            </button>
            {fund && (
              <button onClick={() => {
                setForm({
                  name: fund.name,
                  vintage: String(fund.vintage),
                  committedCapital: String(fund.committedCapital),
                  managementFeePct: String(fund.managementFeePct * 100),
                  carryPct: String(fund.carryPct * 100),
                  hurdleRate: String(fund.hurdleRate * 100),
                  waterfallType: fund.waterfallType,
                  currency: fund.currency,
                  investmentPeriodEnd: fmtDate(fund.investmentPeriodEnd ?? null),
                  fundTermEnd: fmtDate(fund.fundTermEnd ?? null),
                })
                setError('')
                setEditing(false)
              }} className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
