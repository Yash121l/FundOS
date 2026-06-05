'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Plus, DollarSign, Trash2, CheckCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@fundos/shared'
import {
  createFundingRound, deleteFundingRound,
  createFundInvestment, deleteFundInvestment,
  saveValuationMark,
  type FundingRoundData, type FundInvestmentData, type ValuationMarkData,
} from '@/lib/investment-actions'
import type { CompanyInvestments } from '@/lib/investment'
import { cn } from '@/lib/utils'

interface Props {
  companyId: string
  investments: CompanyInvestments
}

const VALUATION_METHODS = ['LAST_ROUND', 'ARR_MULTIPLE', 'DCF', 'PWERM', 'OPM', 'NET_ASSETS']
const METHOD_LABELS: Record<string, string> = {
  LAST_ROUND: 'Last Round', ARR_MULTIPLE: 'ARR Multiple', DCF: 'DCF',
  PWERM: 'PWERM', OPM: 'Option Pricing', NET_ASSETS: 'Net Assets',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

// ── Add Funding Round Modal ────────────────────────────────────

function AddRoundModal({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState<Omit<FundingRoundData, 'companyId'>>({
    roundName: 'Seed', roundType: 'PRICED_EQUITY', closeDate: new Date().toISOString().split('T')[0]!,
    preMoney: null, postMoney: null, roundSize: null, pricePerShare: null,
    shareClass: '', optionPoolPct: null, leadInvestor: '', notes: '',
  })

  function s<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm((f) => ({ ...f, [k]: v })) }
  function num(v: string): number | null { const n = parseFloat(v); return isNaN(n) ? null : n }

  function handleSubmit() {
    if (!form.roundName || !form.closeDate) { setError('Round name and close date are required'); return }
    setError('')
    startTransition(async () => {
      try {
        await createFundingRound({ companyId, ...form })
        setOpen(false)
        onDone()
      } catch (e) { setError('Failed to create round.'); console.error(e) }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Plus size={12} /> Add Round
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-32px)] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
            <Dialog.Title className="text-[14px] font-semibold">Add Funding Round</Dialog.Title>
            <Dialog.Close asChild><button className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button></Dialog.Close>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Round Name">
                <input type="text" value={form.roundName} onChange={(e) => s('roundName', e.target.value)} placeholder="Series A" className="input w-full" />
              </Field>
              <Field label="Round Type">
                <select value={form.roundType} onChange={(e) => s('roundType', e.target.value as never)} className="input w-full">
                  {['SAFE', 'CONVERTIBLE_NOTE', 'PRICED_EQUITY', 'GRANT', 'DEBT'].map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </Field>
              <Field label="Close Date">
                <input type="date" value={form.closeDate} onChange={(e) => s('closeDate', e.target.value)} className="input w-full" />
              </Field>
              <Field label="Round Size ($)">
                <input type="number" value={form.roundSize ?? ''} onChange={(e) => s('roundSize', num(e.target.value))} className="input w-full" />
              </Field>
              <Field label="Pre-Money ($)">
                <input type="number" value={form.preMoney ?? ''} onChange={(e) => s('preMoney', num(e.target.value))} className="input w-full" />
              </Field>
              <Field label="Post-Money ($)">
                <input type="number" value={form.postMoney ?? ''} onChange={(e) => s('postMoney', num(e.target.value))} className="input w-full" />
              </Field>
              <Field label="Price/Share ($)">
                <input type="number" value={form.pricePerShare ?? ''} onChange={(e) => s('pricePerShare', num(e.target.value))} className="input w-full" />
              </Field>
              <Field label="Share Class">
                <input type="text" value={form.shareClass} onChange={(e) => s('shareClass', e.target.value)} placeholder="Preferred Series A" className="input w-full" />
              </Field>
              <Field label="Lead Investor">
                <input type="text" value={form.leadInvestor} onChange={(e) => s('leadInvestor', e.target.value)} className="input w-full" />
              </Field>
              <Field label="Option Pool (%)">
                <input type="number" value={form.optionPoolPct ?? ''} onChange={(e) => s('optionPoolPct', num(e.target.value))} placeholder="10" className="input w-full" />
              </Field>
            </div>
            <Field label="Notes">
              <textarea rows={2} value={form.notes} onChange={(e) => s('notes', e.target.value)} className="input w-full resize-none" />
            </Field>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
          </div>
          <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-background">
            <Dialog.Close asChild><button className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">Cancel</button></Dialog.Close>
            <button onClick={handleSubmit} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}>
              {pending ? 'Saving…' : 'Add Round'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Add Investment Modal ───────────────────────────────────────

function AddInvestmentModal({ companyId, rounds, onDone }: { companyId: string; rounds: CompanyInvestments['fundingRounds']; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState<Omit<FundInvestmentData, 'companyId'>>({
    roundId: rounds[0]?.id ?? null,
    investmentDate: new Date().toISOString().split('T')[0]!,
    securityType: 'PREFERRED',
    amountInvested: 0,
    sharesAcquired: null, entryPricePerShare: null,
    ownershipPctBasic: null, ownershipPctFullyDiluted: null,
    proRataRight: false, boardSeat: false, boardObserver: false,
    followOnReserve: null, notes: '',
  })

  function s<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm((f) => ({ ...f, [k]: v })) }
  function num(v: string): number | null { const n = parseFloat(v); return isNaN(n) ? null : n }

  function handleSubmit() {
    if (!form.investmentDate || !form.amountInvested) { setError('Date and amount are required'); return }
    setError('')
    startTransition(async () => {
      try {
        await createFundInvestment({ companyId, ...form })
        setOpen(false)
        onDone()
      } catch (e) { setError('Failed.'); console.error(e) }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <DollarSign size={12} /> Log Investment
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-32px)] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
            <Dialog.Title className="text-[14px] font-semibold">Log Our Investment</Dialog.Title>
            <Dialog.Close asChild><button className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button></Dialog.Close>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Funding Round">
                <select value={form.roundId ?? ''} onChange={(e) => s('roundId', e.target.value || null)} className="input w-full">
                  <option value="">No specific round</option>
                  {rounds.map((r) => <option key={r.id} value={r.id}>{r.roundName}</option>)}
                </select>
              </Field>
              <Field label="Investment Date">
                <input type="date" value={form.investmentDate} onChange={(e) => s('investmentDate', e.target.value)} className="input w-full" />
              </Field>
              <Field label="Security Type">
                <select value={form.securityType} onChange={(e) => s('securityType', e.target.value as never)} className="input w-full">
                  {['SAFE', 'CONVERTIBLE_NOTE', 'PREFERRED', 'COMMON', 'WARRANT'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Amount Invested ($) *">
                <input type="number" value={form.amountInvested || ''} onChange={(e) => s('amountInvested', parseFloat(e.target.value) || 0)} className="input w-full" />
              </Field>
              <Field label="Shares Acquired">
                <input type="number" value={form.sharesAcquired ?? ''} onChange={(e) => s('sharesAcquired', num(e.target.value))} className="input w-full" />
              </Field>
              <Field label="Entry Price/Share ($)">
                <input type="number" value={form.entryPricePerShare ?? ''} onChange={(e) => s('entryPricePerShare', num(e.target.value))} className="input w-full" />
              </Field>
              <Field label="Ownership % Basic">
                <input type="number" value={form.ownershipPctBasic ?? ''} onChange={(e) => s('ownershipPctBasic', num(e.target.value))} placeholder="5.2" className="input w-full" />
              </Field>
              <Field label="Ownership % FD">
                <input type="number" value={form.ownershipPctFullyDiluted ?? ''} onChange={(e) => s('ownershipPctFullyDiluted', num(e.target.value))} placeholder="4.8" className="input w-full" />
              </Field>
              <Field label="Follow-on Reserve ($)">
                <input type="number" value={form.followOnReserve ?? ''} onChange={(e) => s('followOnReserve', num(e.target.value))} className="input w-full" />
              </Field>
            </div>
            <div className="flex gap-4">
              {[
                { k: 'proRataRight', label: 'Pro-rata right' },
                { k: 'boardSeat', label: 'Board seat' },
                { k: 'boardObserver', label: 'Observer' },
              ].map(({ k, label }) => (
                <label key={k} className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={form[k as keyof typeof form] as boolean} onChange={(e) => s(k as never, e.target.checked as never)} className="accent-primary" />
                  {label}
                </label>
              ))}
            </div>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
          </div>
          <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-background">
            <Dialog.Close asChild><button className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">Cancel</button></Dialog.Close>
            <button onClick={handleSubmit} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}>
              {pending ? 'Saving…' : 'Log Investment'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Add Valuation Mark Modal ───────────────────────────────────

function AddMarkModal({ companyId, investment, onDone }: {
  companyId: string
  investment: CompanyInvestments['investments'][number]
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    markDate: new Date().toISOString().split('T')[0]!,
    fairValue: '',
    valuationMethod: 'LAST_ROUND',
    methodologyNote: '', revenueMultipleUsed: '', comparableSet: '', impliedValuation: '',
    status: 'DRAFT',
  })

  function s(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }
  function num(v: string): number | null { const n = parseFloat(v); return isNaN(n) ? null : n }

  const moic = form.fairValue && investment.amountInvested > 0
    ? (parseFloat(form.fairValue) / investment.amountInvested).toFixed(2)
    : '—'

  function handleSubmit() {
    if (!form.fairValue) { setError('Fair value is required'); return }
    setError('')
    startTransition(async () => {
      try {
        const payload: ValuationMarkData = {
          investmentId: investment.id,
          companyId,
          markDate: form.markDate,
          fairValue: parseFloat(form.fairValue),
          valuationMethod: form.valuationMethod,
          methodologyNote: form.methodologyNote,
          revenueMultipleUsed: num(form.revenueMultipleUsed),
          comparableSet: form.comparableSet,
          impliedValuation: num(form.impliedValuation),
          status: form.status,
        }
        await saveValuationMark(payload)
        setOpen(false)
        onDone()
      } catch (e) { setError('Failed.'); console.error(e) }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="text-[11px] text-primary hover:underline">+ Mark</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-32px)] sm:w-full max-w-md max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
            <Dialog.Title className="text-[14px] font-semibold">Add Valuation Mark</Dialog.Title>
            <Dialog.Close asChild><button className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button></Dialog.Close>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mark Date">
                <input type="date" value={form.markDate} onChange={(e) => s('markDate', e.target.value)} className="input w-full" />
              </Field>
              <Field label="Fair Value ($) *">
                <input type="number" value={form.fairValue} onChange={(e) => s('fairValue', e.target.value)} className="input w-full" />
              </Field>
              <Field label="Method">
                <select value={form.valuationMethod} onChange={(e) => s('valuationMethod', e.target.value)} className="input w-full">
                  {VALUATION_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => s('status', e.target.value)} className="input w-full">
                  <option value="DRAFT">Draft</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="APPROVED">Approved</option>
                </select>
              </Field>
              {form.valuationMethod === 'ARR_MULTIPLE' && (
                <Field label="Revenue Multiple">
                  <input type="number" value={form.revenueMultipleUsed} onChange={(e) => s('revenueMultipleUsed', e.target.value)} placeholder="8.0" className="input w-full" />
                </Field>
              )}
              <Field label="Implied Valuation ($)">
                <input type="number" value={form.impliedValuation} onChange={(e) => s('impliedValuation', e.target.value)} className="input w-full" />
              </Field>
            </div>
            <Field label="Methodology Note">
              <textarea rows={2} value={form.methodologyNote} onChange={(e) => s('methodologyNote', e.target.value)} placeholder="Brief description of inputs and reasoning" className="input w-full resize-none" />
            </Field>
            <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3 flex justify-between items-center">
              <span className="text-[12px] text-muted-foreground">Implied MOIC</span>
              <span className={cn('text-[14px] font-semibold tabular-nums', parseFloat(moic) >= 2 ? 'text-emerald-400' : parseFloat(moic) >= 1 ? 'text-foreground' : 'text-red-400')}>{moic}x</span>
            </div>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
          </div>
          <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-background">
            <Dialog.Close asChild><button className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">Cancel</button></Dialog.Close>
            <button onClick={handleSubmit} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}>
              {pending ? 'Saving…' : 'Save Mark'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Main investment section ────────────────────────────────────

export function InvestmentSection({ companyId, investments }: Props) {
  const [, startTransition] = useTransition()
  const { fundingRounds, investments: inv } = investments

  function handleDeleteRound(id: string) {
    if (!confirm('Delete this round?')) return
    startTransition(async () => { await deleteFundingRound(id) })
  }

  function handleDeleteInvestment(id: string) {
    if (!confirm('Delete this investment?')) return
    startTransition(async () => { await deleteFundInvestment(id) })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium flex items-center gap-2">
          <DollarSign size={14} className="text-muted-foreground" />
          Investment Tracking
        </p>
        <div className="flex gap-2">
          <AddRoundModal companyId={companyId} onDone={() => {}} />
          <AddInvestmentModal companyId={companyId} rounds={fundingRounds} onDone={() => {}} />
        </div>
      </div>

      {/* Funding Rounds */}
      {fundingRounds.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Funding History</p>
          <div className="space-y-2">
            {fundingRounds.map((round) => (
              <div key={round.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/10 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{round.roundName}</span>
                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{round.roundType.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                    <span>{formatDate(round.closeDate)}</span>
                    {round.roundSize && <span>Round: {formatCurrency(round.roundSize, true)}</span>}
                    {round.postMoney && <span>Post: {formatCurrency(round.postMoney, true)}</span>}
                    {round.leadInvestor && <span>Lead: {round.leadInvestor}</span>}
                  </div>
                </div>
                <button onClick={() => handleDeleteRound(round.id)} className="text-muted-foreground hover:text-red-400 transition-colors p-1">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Our Investments */}
      {inv.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Our Stake</p>
          <div className="space-y-2">
            {inv.map((i) => {
              const mark = i.valuationMarks[0]
              const fairValue = mark?.fairValue ?? i.amountInvested
              const moic = i.amountInvested > 0 ? fairValue / i.amountInvested : null

              return (
                <div key={i.id} className="rounded-lg border border-border bg-secondary/10 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium">{i.round?.roundName ?? i.securityType}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(i.investmentDate)}</span>
                        {i.boardSeat && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">Board</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Invested</p>
                          <p className="text-[12px] font-semibold tabular-nums">{formatCurrency(i.amountInvested, true)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Fair Value</p>
                          <p className="text-[12px] font-semibold tabular-nums">{formatCurrency(fairValue, true)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">MOIC</p>
                          <p className={cn('text-[12px] font-semibold tabular-nums', moic != null ? (moic >= 2 ? 'text-emerald-400' : moic >= 1 ? 'text-foreground' : 'text-red-400') : 'text-muted-foreground')}>
                            {moic != null ? `${moic.toFixed(2)}x` : '—'}
                          </p>
                        </div>
                      </div>
                      {i.ownershipPctFullyDiluted != null && (
                        <p className="text-[11px] text-muted-foreground mt-1">Ownership: {i.ownershipPctFullyDiluted.toFixed(2)}% FD</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <AddMarkModal companyId={companyId} investment={i} onDone={() => {}} />
                        {mark && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <CheckCircle size={10} className={mark.status === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'} />
                            {METHOD_LABELS[mark.valuationMethod]} · {mark.status}
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteInvestment(i.id)} className="text-muted-foreground hover:text-red-400 transition-colors p-1 flex-shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {fundingRounds.length === 0 && inv.length === 0 && (
        <div className="py-6 text-center text-[13px] text-muted-foreground">
          No investment data yet. Add funding rounds and log our stake.
        </div>
      )}
    </div>
  )
}
