'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import Link from 'next/link'
import { X, Plus, Trash2, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate } from '@fundos/shared'
import { saveFundProfile, createCapitalActivity, deleteCapitalActivity, type FundProfileData, type CapitalActivityData } from '@/lib/fund-actions'
import type { FundPerformance } from '@/lib/fund-performance'
import { cn } from '@/lib/utils'

interface Props {
  data: FundPerformance | null
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-[22px] font-bold tabular-nums', color ?? 'text-foreground')}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

// ── Fund Profile Setup ────────────────────────────────────────

function FundSetupModal({ existing, onDone }: { existing?: FundPerformance['profile'] | null; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [form, setForm] = useState<FundProfileData>({
    name: existing?.name ?? 'Fund I',
    vintage: existing?.vintage ?? new Date().getFullYear(),
    committedCapital: existing?.committedCapital ?? 0,
    managementFeePct: existing?.managementFeePct ?? 0.02,
    carryPct: existing?.carryPct ?? 0.20,
    hurdleRate: existing?.hurdleRate ?? 0.08,
    waterfallType: existing?.waterfallType ?? 'EUROPEAN',
    investmentPeriodEnd: existing?.investmentPeriodEnd ? new Date(existing.investmentPeriodEnd).toISOString().split('T')[0]! : '',
    fundTermEnd: existing?.fundTermEnd ? new Date(existing.fundTermEnd).toISOString().split('T')[0]! : '',
    currency: existing?.currency ?? 'USD',
  })

  function s<K extends keyof FundProfileData>(k: K, v: FundProfileData[K]) { setForm((f) => ({ ...f, [k]: v })) }

  function handleSubmit() {
    if (!form.name || !form.committedCapital) { setError('Name and committed capital required'); return }
    setError('')
    startTransition(async () => {
      try { await saveFundProfile(form); setOpen(false); onDone() }
      catch (e) { setError('Failed.'); console.error(e) }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          {existing ? 'Edit Fund Profile' : 'Setup Fund Profile'}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
            <Dialog.Title className="text-[14px] font-semibold">Fund Profile</Dialog.Title>
            <Dialog.Close asChild><button className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button></Dialog.Close>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fund Name"><input type="text" value={form.name} onChange={(e) => s('name', e.target.value)} className="input w-full" /></Field>
              <Field label="Vintage Year"><input type="number" value={form.vintage} onChange={(e) => s('vintage', parseInt(e.target.value))} className="input w-full" /></Field>
              <Field label="Committed Capital ($)"><input type="number" value={form.committedCapital || ''} onChange={(e) => s('committedCapital', parseFloat(e.target.value) || 0)} className="input w-full" /></Field>
              <Field label="Currency"><select value={form.currency} onChange={(e) => s('currency', e.target.value)} className="input w-full"><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></Field>
              <Field label="Management Fee (%)"><input type="number" step="0.01" value={(form.managementFeePct * 100).toFixed(1)} onChange={(e) => s('managementFeePct', parseFloat(e.target.value) / 100)} className="input w-full" /></Field>
              <Field label="Carry (%)"><input type="number" step="1" value={(form.carryPct * 100).toFixed(0)} onChange={(e) => s('carryPct', parseFloat(e.target.value) / 100)} className="input w-full" /></Field>
              <Field label="Hurdle Rate (%)"><input type="number" step="1" value={(form.hurdleRate * 100).toFixed(0)} onChange={(e) => s('hurdleRate', parseFloat(e.target.value) / 100)} className="input w-full" /></Field>
              <Field label="Waterfall">
                <select value={form.waterfallType} onChange={(e) => s('waterfallType', e.target.value as never)} className="input w-full">
                  <option value="EUROPEAN">European (whole-fund)</option>
                  <option value="AMERICAN">American (deal-by-deal)</option>
                </select>
              </Field>
              <Field label="Investment Period End"><input type="date" value={form.investmentPeriodEnd ?? ''} onChange={(e) => s('investmentPeriodEnd', e.target.value || null)} className="input w-full" /></Field>
              <Field label="Fund Term End"><input type="date" value={form.fundTermEnd ?? ''} onChange={(e) => s('fundTermEnd', e.target.value || null)} className="input w-full" /></Field>
            </div>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
          </div>
          <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-background">
            <Dialog.Close asChild><button className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">Cancel</button></Dialog.Close>
            <button onClick={handleSubmit} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}>Save</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Capital Activity Modal ─────────────────────────────────────

function AddActivityModal({ fundId, onDone }: { fundId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState<Omit<CapitalActivityData, 'fundId'>>({
    date: new Date().toISOString().split('T')[0]!, type: 'CAPITAL_CALL', amount: 0, description: '', lpName: '',
  })

  function s<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm((f) => ({ ...f, [k]: v })) }

  function handleSubmit() {
    if (!form.amount) { setError('Amount required'); return }
    startTransition(async () => {
      try { await createCapitalActivity({ fundId, ...form }); setOpen(false); onDone() }
      catch (e) { setError('Failed.'); console.error(e) }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Plus size={12} /> Log Activity
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
            <Dialog.Title className="text-[14px] font-semibold">Log Capital Activity</Dialog.Title>
            <Dialog.Close asChild><button className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button></Dialog.Close>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Type">
              <select value={form.type} onChange={(e) => s('type', e.target.value as never)} className="input w-full">
                {['CAPITAL_CALL', 'DISTRIBUTION', 'MANAGEMENT_FEE', 'FUND_EXPENSE', 'CARRIED_INTEREST'].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </Field>
            <Field label="Date"><input type="date" value={form.date} onChange={(e) => s('date', e.target.value)} className="input w-full" /></Field>
            <Field label="Amount ($)"><input type="number" value={form.amount || ''} onChange={(e) => s('amount', parseFloat(e.target.value) || 0)} className="input w-full" /></Field>
            <Field label="LP Name (optional)"><input type="text" value={form.lpName} onChange={(e) => s('lpName', e.target.value)} className="input w-full" /></Field>
            <Field label="Description"><input type="text" value={form.description} onChange={(e) => s('description', e.target.value)} className="input w-full" /></Field>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
          </div>
          <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-background">
            <Dialog.Close asChild><button className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">Cancel</button></Dialog.Close>
            <button onClick={handleSubmit} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}>Save</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Main Fund Performance View ────────────────────────────────

export function FundPerformanceView({ data }: Props) {
  const [, startTransition] = useTransition()
  const [tab, setTab] = useState<'overview' | 'schedule' | 'activity'>('overview')

  if (!data) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[18px] font-semibold">Fund Performance</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">TVPI · DPI · RVPI · Net IRR · Schedule of Investments</p>
          </div>
          <FundSetupModal onDone={() => {}} />
        </div>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <TrendingUp size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-[14px] font-medium mb-1">Fund profile not configured</p>
          <p className="text-[13px] text-muted-foreground">Set up your fund profile to track TVPI, DPI, IRR, and generate ILPA-compliant reports.</p>
        </div>
      </div>
    )
  }

  const irr = data.netIrr != null ? `${(data.netIrr * 100).toFixed(1)}%` : '—'
  const moicColor = data.grossMoic != null ? (data.grossMoic >= 2 ? 'text-emerald-400' : data.grossMoic >= 1 ? 'text-foreground' : 'text-red-400') : 'text-muted-foreground'

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[18px] font-semibold">{data.profile.name}</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Vintage {data.profile.vintage} · {formatCurrency(data.profile.committedCapital, true)} committed</p>
        </div>
        <div className="flex gap-2">
          <FundSetupModal existing={data.profile} onDone={() => {}} />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="TVPI" value={data.tvpi != null ? `${data.tvpi.toFixed(2)}x` : '—'} sub="Net of fees" color={data.tvpi != null ? (data.tvpi >= 2 ? 'text-emerald-400' : data.tvpi >= 1 ? 'text-foreground' : 'text-red-400') : undefined} />
        <Stat label="DPI" value={data.dpi != null ? `${data.dpi.toFixed(2)}x` : '—'} sub="Cash returned" />
        <Stat label="RVPI" value={data.rvpi != null ? `${data.rvpi.toFixed(2)}x` : '—'} sub="Unrealized" />
        <Stat label="Net IRR" value={irr} sub="XIRR on LP cashflows" color={data.netIrr != null ? (data.netIrr >= 0.2 ? 'text-emerald-400' : data.netIrr >= 0.1 ? 'text-foreground' : 'text-red-400') : undefined} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Called Capital" value={formatCurrency(data.calledCapital, true)} sub={`${(data.deploymentPct * 100).toFixed(0)}% deployed`} />
        <Stat label="Distributions" value={formatCurrency(data.distributions, true)} />
        <Stat label="Portfolio NAV" value={formatCurrency(data.nav, true)} />
        <Stat label="Gross MOIC" value={data.grossMoic != null ? `${data.grossMoic.toFixed(2)}x` : '—'} sub={`${formatCurrency(data.totalCostBasis, true)} → ${formatCurrency(data.totalFairValue, true)}`} color={moicColor} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 w-fit">
        {(['overview', 'schedule', 'activity'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('h-7 px-3 rounded-md text-[12px] font-medium transition-colors capitalize', tab === t ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {t === 'schedule' ? 'Schedule of Investments' : t}
          </button>
        ))}
      </div>

      {/* Schedule of Investments */}
      {tab === 'schedule' && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-secondary/40 border-b border-border">
                {['Company', 'Security', 'Date', 'Cost', 'Fair Value', 'MOIC', 'Gross IRR', 'Ownership %', 'Method'].map((h) => (
                  <th key={h} className="py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {data.scheduleOfInvestments.map((inv) => {
                  const moicColor = inv.moic != null ? (inv.moic >= 2 ? 'text-emerald-400' : inv.moic >= 1 ? 'text-foreground' : 'text-red-400') : 'text-muted-foreground'
                  return (
                    <tr key={inv.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                      <td className="px-3 py-2">
                        <Link href={`/portfolio/${inv.companySlug}`} className="text-[12px] font-medium hover:text-primary transition-colors">{inv.companyName}</Link>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">{inv.roundName}</td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(inv.investmentDate)}</td>
                      <td className="px-3 py-2 text-[12px] tabular-nums font-mono">{formatCurrency(inv.amountInvested, true)}</td>
                      <td className="px-3 py-2 text-[12px] tabular-nums font-mono">{formatCurrency(inv.fairValue, true)}</td>
                      <td className={cn('px-3 py-2 text-[12px] font-semibold tabular-nums', moicColor)}>{inv.moic != null ? `${inv.moic.toFixed(2)}x` : '—'}</td>
                      <td className="px-3 py-2 text-[12px] tabular-nums text-muted-foreground">{inv.grossIrr != null ? `${(inv.grossIrr * 100).toFixed(1)}%` : '—'}</td>
                      <td className="px-3 py-2 text-[12px] tabular-nums text-muted-foreground">{inv.ownershipPctFullyDiluted != null ? `${inv.ownershipPctFullyDiluted.toFixed(2)}%` : '—'}</td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground">{inv.valuationMethod.replace('_', ' ')}</td>
                    </tr>
                  )
                })}
                {data.scheduleOfInvestments.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-[13px] text-muted-foreground">No investments tracked yet. Log investments on company detail pages.</td></tr>
                )}
              </tbody>
              {data.scheduleOfInvestments.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-secondary/20">
                    <td className="px-3 py-2 text-[12px] font-semibold" colSpan={3}>Totals</td>
                    <td className="px-3 py-2 text-[12px] font-semibold tabular-nums font-mono">{formatCurrency(data.totalCostBasis, true)}</td>
                    <td className="px-3 py-2 text-[12px] font-semibold tabular-nums font-mono">{formatCurrency(data.totalFairValue, true)}</td>
                    <td className={cn('px-3 py-2 text-[12px] font-semibold tabular-nums', moicColor)}>{data.grossMoic != null ? `${data.grossMoic.toFixed(2)}x` : '—'}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Capital Activity */}
      {tab === 'activity' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium">Capital Activity</p>
            <AddActivityModal fundId={data.profile.id} onDone={() => {}} />
          </div>
          {data.activities.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-[13px] text-muted-foreground">
              No capital activity yet. Log capital calls, distributions, fees, and carry events.
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left">
                <thead><tr className="bg-secondary/40 border-b border-border">
                  {['Date', 'Type', 'Amount', 'LP', 'Description', ''].map((h) => (
                    <th key={h} className="py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {data.activities.map((a) => {
                    const typeColor: Record<string, string> = {
                      CAPITAL_CALL: 'text-blue-400', DISTRIBUTION: 'text-emerald-400',
                      MANAGEMENT_FEE: 'text-amber-400', FUND_EXPENSE: 'text-red-400', CARRIED_INTEREST: 'text-purple-400',
                    }
                    return (
                      <tr key={a.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                        <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(a.date)}</td>
                        <td className="px-3 py-2">
                          <span className={cn('text-[11px] font-medium', typeColor[a.type] ?? 'text-muted-foreground')}>{a.type.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="px-3 py-2 text-[12px] font-semibold tabular-nums">{formatCurrency(a.amount, true)}</td>
                        <td className="px-3 py-2 text-[11px] text-muted-foreground">{a.lpName ?? '—'}</td>
                        <td className="px-3 py-2 text-[11px] text-muted-foreground">{a.description ?? '—'}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => { if (confirm('Delete?')) startTransition(async () => { await deleteCapitalActivity(a.id) }) }} className="text-muted-foreground hover:text-red-400 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Overview — deployment analytics */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Deployment bar */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[12px] font-medium mb-3">Capital Deployment</p>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Deployed</span><span>{formatCurrency(data.calledCapital, true)}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(data.deploymentPct * 100, 100)}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Remaining</span><span>{formatCurrency(data.unfundedCommitment, true)}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Reserve set aside: {formatCurrency(data.totalFollowOnReserves, true)}</p>
          </div>

          {/* ILPA compliance notice */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[12px] font-medium mb-2">ILPA v2.0 Compliance</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              ILPA v2.0 Performance Template requires TVPI, Gross/Net MOIC, and Gross/Net IRR reporting.
              All metrics are computed per the ILPA standard (January 2025).
            </p>
            <div className="mt-3 space-y-1">
              {[
                { label: 'Net TVPI', ready: data.tvpi != null },
                { label: 'Net IRR (XIRR)', ready: data.netIrr != null },
                { label: 'Gross MOIC', ready: data.grossMoic != null },
                { label: 'DPI', ready: data.dpi != null },
              ].map(({ label, ready }) => (
                <div key={label} className="flex items-center gap-2 text-[11px]">
                  <span className={ready ? 'text-emerald-400' : 'text-muted-foreground/40'}>{ready ? '✓' : '○'}</span>
                  <span className={ready ? 'text-foreground' : 'text-muted-foreground/40'}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
