'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, GitBranch } from 'lucide-react'
import { logMrrBridge } from '@/lib/saas-actions'
import { getPeriodOptions } from '@fundos/shared'
import { cn } from '@/lib/utils'

interface Props { companyId: string; companyName: string }

export function LogMrrBridgeModal({ companyId, companyName }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const periods = getPeriodOptions(12)

  const [form, setForm] = useState({
    period: periods[0] ?? '',
    beginningMrr: '', newMrr: '0', expansionMrr: '0',
    reactivationMrr: '0', contractionMrr: '0', churnedMrr: '0',
    newCustomers: '', churnedCustomers: '', totalCustomers: '',
  })

  function s(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); setSuccess(false) }
  function num(v: string, def = 0) { const n = parseFloat(v); return isNaN(n) ? def : n }
  function ni(v: string): number | null { const n = parseInt(v); return isNaN(n) ? null : n }

  const endingMrr = num(form.beginningMrr) + num(form.newMrr) + num(form.expansionMrr) +
    num(form.reactivationMrr) - num(form.contractionMrr) - num(form.churnedMrr)

  function handleSubmit() {
    if (!form.period || !form.beginningMrr) { setError('Period and Beginning MRR are required'); return }
    setError('')
    startTransition(async () => {
      try {
        await logMrrBridge({
          companyId, period: form.period,
          beginningMrr: num(form.beginningMrr),
          newMrr: num(form.newMrr),
          expansionMrr: num(form.expansionMrr),
          reactivationMrr: num(form.reactivationMrr),
          contractionMrr: num(form.contractionMrr),
          churnedMrr: num(form.churnedMrr),
          newCustomers: ni(form.newCustomers),
          churnedCustomers: ni(form.churnedCustomers),
          totalCustomers: ni(form.totalCustomers),
        })
        setSuccess(true)
        setTimeout(() => { setOpen(false); setSuccess(false) }, 1200)
      } catch (e) { setError('Failed to save.'); console.error(e) }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <GitBranch size={12} />
          MRR Bridge
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
            <div>
              <Dialog.Title className="text-[14px] font-semibold">Log MRR Bridge</Dialog.Title>
              <p className="text-[11px] text-muted-foreground mt-0.5">{companyName}</p>
            </div>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button>
            </Dialog.Close>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Period">
              <select value={form.period} onChange={(e) => s('period', e.target.value)} className="input w-full">
                {periods.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'beginningMrr', label: 'Beginning MRR ($)' },
                { k: 'newMrr', label: 'New MRR ($)' },
                { k: 'expansionMrr', label: 'Expansion MRR ($)' },
                { k: 'reactivationMrr', label: 'Reactivation MRR ($)' },
                { k: 'contractionMrr', label: 'Contraction MRR ($)' },
                { k: 'churnedMrr', label: 'Churned MRR ($)' },
              ].map(({ k, label }) => (
                <Field key={k} label={label}>
                  <input type="number" value={form[k as keyof typeof form]} onChange={(e) => s(k, e.target.value)} className="input w-full" />
                </Field>
              ))}
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Ending MRR</span>
                <span className="text-[14px] font-semibold tabular-nums">${endingMrr.toLocaleString()}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { k: 'newCustomers', label: 'New Customers' },
                { k: 'churnedCustomers', label: 'Churned' },
                { k: 'totalCustomers', label: 'Total' },
              ].map(({ k, label }) => (
                <Field key={k} label={label}>
                  <input type="number" value={form[k as keyof typeof form]} onChange={(e) => s(k, e.target.value)} className="input w-full" />
                </Field>
              ))}
            </div>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            {success && <p className="text-[12px] text-emerald-400">✓ Saved</p>}
          </div>
          <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-background">
            <Dialog.Close asChild>
              <button className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
            </Dialog.Close>
            <button onClick={handleSubmit} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium transition-colors', pending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90')}>
              {pending ? 'Saving…' : 'Save Bridge'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
