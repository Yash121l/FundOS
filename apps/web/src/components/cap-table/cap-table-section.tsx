'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Plus, Trash2, Table } from 'lucide-react'
import { formatCurrency, formatDate } from '@fundos/shared'
import {
  createCapTableEntry, deleteCapTableEntry,
  createSafeNote, deleteSafeNote,
  createConvertibleNote, deleteConvertibleNote,
} from '@/lib/cap-table-actions'
import type { CapTable } from '@/lib/investment'
import { computeFullyDilutedShares } from '@/lib/investment'
import { LiquidationWaterfall } from './liquidation-waterfall'
import { cn } from '@/lib/utils'

interface Props {
  companyId: string
  capTable: CapTable
}

type SubTab = 'captable' | 'safe' | 'notes' | 'waterfall'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

// ── Cap Table Entries View ─────────────────────────────────────

function CapTableEntries({ companyId, capTable }: { companyId: string; capTable: CapTable }) {
  const [, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    holderName: '', holderType: 'INVESTOR', shareClass: 'Preferred Series A',
    sharesIssued: '', ownershipPctBasic: '', ownershipPctFullyDiluted: '',
    liquidationPreference: '1', participating: false, antiDilution: 'NONE',
    votingRightsPerShare: '1', boardSeat: false, roundId: '',
  })

  const [pending, startSave] = useTransition()
  const [error, setError] = useState('')

  const fd = computeFullyDilutedShares(capTable.entries, capTable.optionPools[0] ?? null)

  function safeNum(v: string): number | null {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : null
  }

  function handleSave() {
    if (!formData.holderName || !formData.sharesIssued) { setError('Name and shares required'); return }
    const sharesIssued = safeNum(formData.sharesIssued)
    if (sharesIssued === null) { setError('Shares must be a valid number'); return }
    setError('')
    startSave(async () => {
      try {
        await createCapTableEntry({
          companyId,
          roundId: formData.roundId || null,
          holderName: formData.holderName,
          holderType: formData.holderType as never,
          shareClass: formData.shareClass,
          sharesIssued,
          ownershipPctBasic: safeNum(formData.ownershipPctBasic),
          ownershipPctFullyDiluted: safeNum(formData.ownershipPctFullyDiluted),
          liquidationPreference: safeNum(formData.liquidationPreference),
          participating: formData.participating,
          antiDilution: formData.antiDilution as never,
          votingRightsPerShare: safeNum(formData.votingRightsPerShare) ?? 1,
          boardSeat: formData.boardSeat,
        })
        setShowForm(false)
      } catch (e) { setError('Failed.'); console.error(e) }
    })
  }

  const holderTypeColor: Record<string, string> = {
    FOUNDER: 'bg-purple-500/10 text-purple-400',
    INVESTOR: 'bg-blue-500/10 text-blue-400',
    EMPLOYEE: 'bg-green-500/10 text-green-400',
    OPTION_POOL: 'bg-amber-500/10 text-amber-400',
    WARRANT: 'bg-red-500/10 text-red-400',
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {fd > 0 && <p className="text-[12px] text-muted-foreground">Fully diluted: {fd.toLocaleString()} shares</p>}
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Plus size={12} /> Add Entry
        </button>
      </div>

      {capTable.entries.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-muted-foreground">No cap table entries yet.</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-secondary/40 border-b border-border">
                {['Holder', 'Type', 'Class', 'Shares', 'Ownership %', 'Pref', 'Board'].map((h) => (
                  <th key={h} className="py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
                <th className="py-2 px-3" />
              </tr></thead>
              <tbody>
                {capTable.entries.map((e) => (
                  <tr key={e.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                    <td className="px-3 py-2 text-[12px] font-medium">{e.holderName}</td>
                    <td className="px-3 py-2">
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', holderTypeColor[e.holderType] ?? 'bg-secondary text-muted-foreground')}>{e.holderType}</span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">{e.shareClass}</td>
                    <td className="px-3 py-2 text-[12px] tabular-nums font-mono">{e.sharesIssued.toLocaleString()}</td>
                    <td className="px-3 py-2 text-[12px] tabular-nums">{e.ownershipPctFullyDiluted != null ? `${e.ownershipPctFullyDiluted.toFixed(2)}%` : '—'}</td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">{e.liquidationPreference != null ? `${e.liquidationPreference}x` : '—'}{e.participating ? ' +part.' : ''}</td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">{e.boardSeat ? '✓' : '—'}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => { if (confirm('Delete?')) startTransition(async () => { await deleteCapTableEntry(e.id) }) }} className="text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <Dialog.Root open onOpenChange={() => setShowForm(false)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
                <Dialog.Title className="text-[14px] font-semibold">Add Cap Table Entry</Dialog.Title>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Holder Name">
                    <input type="text" value={formData.holderName} onChange={(e) => setFormData((f) => ({ ...f, holderName: e.target.value }))} className="input w-full" />
                  </Field>
                  <Field label="Holder Type">
                    <select value={formData.holderType} onChange={(e) => setFormData((f) => ({ ...f, holderType: e.target.value }))} className="input w-full">
                      {['FOUNDER', 'INVESTOR', 'EMPLOYEE', 'OPTION_POOL', 'WARRANT'].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Share Class">
                    <input type="text" value={formData.shareClass} onChange={(e) => setFormData((f) => ({ ...f, shareClass: e.target.value }))} className="input w-full" />
                  </Field>
                  <Field label="Shares Issued">
                    <input type="number" value={formData.sharesIssued} onChange={(e) => setFormData((f) => ({ ...f, sharesIssued: e.target.value }))} className="input w-full" />
                  </Field>
                  <Field label="Ownership % (FD)">
                    <input type="number" value={formData.ownershipPctFullyDiluted} onChange={(e) => setFormData((f) => ({ ...f, ownershipPctFullyDiluted: e.target.value }))} placeholder="5.2" className="input w-full" />
                  </Field>
                  <Field label="Liquidation Pref (x)">
                    <input type="number" value={formData.liquidationPreference} onChange={(e) => setFormData((f) => ({ ...f, liquidationPreference: e.target.value }))} placeholder="1" className="input w-full" />
                  </Field>
                  <Field label="Anti-Dilution">
                    <select value={formData.antiDilution} onChange={(e) => setFormData((f) => ({ ...f, antiDilution: e.target.value }))} className="input w-full">
                      <option value="NONE">None</option>
                      <option value="WEIGHTED_AVERAGE_BROAD">WA Broad</option>
                      <option value="WEIGHTED_AVERAGE_NARROW">WA Narrow</option>
                      <option value="FULL_RATCHET">Full Ratchet</option>
                    </select>
                  </Field>
                </div>
                <div className="flex gap-4">
                  {[{ k: 'participating', l: 'Participating preferred' }, { k: 'boardSeat', l: 'Board seat' }].map(({ k, l }) => (
                    <label key={k} className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={formData[k as keyof typeof formData] as boolean} onChange={(e) => setFormData((f) => ({ ...f, [k]: e.target.checked }))} className="accent-primary" />
                      {l}
                    </label>
                  ))}
                </div>
                {error && <p className="text-[12px] text-red-400">{error}</p>}
              </div>
              <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-background">
                <button onClick={() => setShowForm(false)} className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">Cancel</button>
                <button onClick={handleSave} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}>
                  {pending ? 'Saving…' : 'Add Entry'}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  )
}

// ── SAFE Notes ─────────────────────────────────────────────────

function SafeNotes({ companyId, capTable }: { companyId: string; capTable: CapTable }) {
  const [, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [pending, startSave] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({ investorName: '', amount: '', issueDate: new Date().toISOString().split('T')[0]!, safeType: 'POST_MONEY', valuationCap: '', discountRate: '', mfn: false, proRataRight: false, triggerAmount: '' })

  function safeNum(v: string): number | null {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : null
  }

  function handleSave() {
    if (!form.investorName || !form.amount) { setError('Investor name and amount required'); return }
    const amount = safeNum(form.amount)
    if (amount === null) { setError('Amount must be a valid number'); return }
    setError('')
    startSave(async () => {
      try {
        await createSafeNote({ companyId, investorName: form.investorName, amount, issueDate: form.issueDate, safeType: form.safeType, valuationCap: safeNum(form.valuationCap), discountRate: safeNum(form.discountRate), mfn: form.mfn, proRataRight: form.proRataRight, triggerAmount: safeNum(form.triggerAmount) })
        setShowForm(false)
      } catch (e) { setError('Failed.'); console.error(e) }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Plus size={12} /> Add SAFE
        </button>
      </div>
      {capTable.safeNotes.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-muted-foreground">No SAFE notes.</div>
      ) : (
        <div className="space-y-2">
          {capTable.safeNotes.map((note) => (
            <div key={note.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/10 px-3 py-2.5">
              <div>
                <p className="text-[12px] font-medium">{note.investorName}</p>
                <div className="flex gap-3 text-[11px] text-muted-foreground mt-0.5">
                  <span>{formatCurrency(note.amount, true)}</span>
                  <span>{note.safeType}</span>
                  {note.valuationCap && <span>Cap: {formatCurrency(note.valuationCap, true)}</span>}
                  {note.discountRate && <span>Discount: {note.discountRate}%</span>}
                  <span className={cn('font-medium', note.status === 'OUTSTANDING' ? 'text-amber-400' : note.status === 'CONVERTED' ? 'text-emerald-400' : 'text-muted-foreground')}>{note.status}</span>
                </div>
              </div>
              <button onClick={() => { if (confirm('Delete?')) startTransition(async () => { await deleteSafeNote(note.id) }) }} className="text-muted-foreground hover:text-red-400"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <Dialog.Root open onOpenChange={() => setShowForm(false)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
                <Dialog.Title className="text-[14px] font-semibold">Add SAFE Note</Dialog.Title>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Investor"><input type="text" value={form.investorName} onChange={(e) => setForm((f) => ({ ...f, investorName: e.target.value }))} className="input w-full" /></Field>
                  <Field label="Amount ($)"><input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="input w-full" /></Field>
                  <Field label="Issue Date"><input type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} className="input w-full" /></Field>
                  <Field label="Type"><select value={form.safeType} onChange={(e) => setForm((f) => ({ ...f, safeType: e.target.value }))} className="input w-full"><option value="POST_MONEY">Post-Money</option><option value="PRE_MONEY">Pre-Money</option></select></Field>
                  <Field label="Valuation Cap ($)"><input type="number" value={form.valuationCap} onChange={(e) => setForm((f) => ({ ...f, valuationCap: e.target.value }))} className="input w-full" /></Field>
                  <Field label="Discount (%)"><input type="number" value={form.discountRate} onChange={(e) => setForm((f) => ({ ...f, discountRate: e.target.value }))} placeholder="20" className="input w-full" /></Field>
                </div>
                {error && <p className="text-[12px] text-red-400">{error}</p>}
              </div>
              <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-background">
                <button onClick={() => setShowForm(false)} className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">Cancel</button>
                <button onClick={handleSave} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}>Save</button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  )
}

// ── Convertible Notes ─────────────────────────────────────────

function ConvertibleNotes({ companyId, capTable }: { companyId: string; capTable: CapTable }) {
  const [, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [pending, startSave] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({ investorName: '', principal: '', issueDate: new Date().toISOString().split('T')[0]!, maturityDate: '', interestRate: '', interestType: 'SIMPLE', valuationCap: '', discountRate: '', mfn: false })

  function safeNum(v: string): number | null {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : null
  }

  function handleSave() {
    if (!form.investorName || !form.principal) { setError('Investor name and principal required'); return }
    const principal = safeNum(form.principal)
    if (principal === null) { setError('Principal must be a valid number'); return }
    setError('')
    startSave(async () => {
      try {
        await createConvertibleNote({ companyId, investorName: form.investorName, principal, issueDate: form.issueDate, maturityDate: form.maturityDate || null, interestRate: safeNum(form.interestRate), interestType: form.interestType, valuationCap: safeNum(form.valuationCap), discountRate: safeNum(form.discountRate), mfn: form.mfn })
        setShowForm(false)
      } catch (e) { setError('Failed.'); console.error(e) }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Plus size={12} /> Add Note
        </button>
      </div>
      {capTable.convertibleNotes.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-muted-foreground">No convertible notes.</div>
      ) : (
        <div className="space-y-2">
          {capTable.convertibleNotes.map((note) => (
            <div key={note.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/10 px-3 py-2.5">
              <div>
                <p className="text-[12px] font-medium">{note.investorName}</p>
                <div className="flex gap-3 text-[11px] text-muted-foreground mt-0.5">
                  <span>Principal: {formatCurrency(note.principal, true)}</span>
                  {note.interestRate && <span>{note.interestRate}% {note.interestType}</span>}
                  {note.maturityDate && <span>Matures: {formatDate(note.maturityDate)}</span>}
                  <span className={cn('font-medium', note.status === 'OUTSTANDING' ? 'text-amber-400' : 'text-emerald-400')}>{note.status}</span>
                </div>
              </div>
              <button onClick={() => { if (confirm('Delete?')) startTransition(async () => { await deleteConvertibleNote(note.id) }) }} className="text-muted-foreground hover:text-red-400"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <Dialog.Root open onOpenChange={() => setShowForm(false)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
                <Dialog.Title className="text-[14px] font-semibold">Add Convertible Note</Dialog.Title>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Investor"><input type="text" value={form.investorName} onChange={(e) => setForm((f) => ({ ...f, investorName: e.target.value }))} className="input w-full" /></Field>
                  <Field label="Principal ($)"><input type="number" value={form.principal} onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value }))} className="input w-full" /></Field>
                  <Field label="Issue Date"><input type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} className="input w-full" /></Field>
                  <Field label="Maturity Date"><input type="date" value={form.maturityDate} onChange={(e) => setForm((f) => ({ ...f, maturityDate: e.target.value }))} className="input w-full" /></Field>
                  <Field label="Interest Rate (%)"><input type="number" value={form.interestRate} onChange={(e) => setForm((f) => ({ ...f, interestRate: e.target.value }))} placeholder="6" className="input w-full" /></Field>
                  <Field label="Interest Type"><select value={form.interestType} onChange={(e) => setForm((f) => ({ ...f, interestType: e.target.value }))} className="input w-full"><option value="SIMPLE">Simple</option><option value="COMPOUND">Compound</option></select></Field>
                  <Field label="Valuation Cap ($)"><input type="number" value={form.valuationCap} onChange={(e) => setForm((f) => ({ ...f, valuationCap: e.target.value }))} className="input w-full" /></Field>
                  <Field label="Discount (%)"><input type="number" value={form.discountRate} onChange={(e) => setForm((f) => ({ ...f, discountRate: e.target.value }))} placeholder="20" className="input w-full" /></Field>
                </div>
                {error && <p className="text-[12px] text-red-400">{error}</p>}
              </div>
              <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-background">
                <button onClick={() => setShowForm(false)} className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">Cancel</button>
                <button onClick={handleSave} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}>Save</button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  )
}

// ── Main Cap Table Section ─────────────────────────────────────

export function CapTableSection({ companyId, capTable }: Props) {
  const [tab, setTab] = useState<SubTab>('captable')

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium flex items-center gap-2">
          <Table size={14} className="text-muted-foreground" />
          Cap Table
        </p>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {(['captable', 'safe', 'notes', 'waterfall'] as SubTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn('h-6 px-2.5 rounded-md text-[11px] font-medium transition-colors', tab === t ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {t === 'captable' ? 'Shares' : t === 'safe' ? 'SAFEs' : t === 'notes' ? 'Notes' : 'Waterfall'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'captable' && <CapTableEntries companyId={companyId} capTable={capTable} />}
      {tab === 'safe' && <SafeNotes companyId={companyId} capTable={capTable} />}
      {tab === 'notes' && <ConvertibleNotes companyId={companyId} capTable={capTable} />}
      {tab === 'waterfall' && <LiquidationWaterfall capTable={capTable} />}
    </div>
  )
}
