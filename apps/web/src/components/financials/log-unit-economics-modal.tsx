'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, TrendingUp } from 'lucide-react'
import { logUnitEconomics } from '@/lib/saas-actions'
import { getPeriodOptions } from '@fundos/shared'
import { cn } from '@/lib/utils'

interface Props { companyId: string; companyName: string; open?: boolean; onOpenChange?: (open: boolean) => void }

export function LogUnitEconomicsModal({ companyId, companyName, open: openProp, onOpenChange: onChangeProp }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp! : internalOpen
  const setOpen = isControlled ? (v: boolean) => onChangeProp?.(v) : setInternalOpen
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const periods = getPeriodOptions(12)

  const [form, setForm] = useState({
    period: periods[0] ?? '',
    cac: '', ltv: '', cacPaybackMonths: '', arpa: '', acv: '',
    newCacRatio: '', smSpend: '', newCustomers: '',
  })

  function s(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); setSuccess(false) }
  function num(v: string): number | null { const n = parseFloat(v); return isNaN(n) ? null : n }
  function ni(v: string): number | null { const n = parseInt(v); return isNaN(n) ? null : n }

  const ltvCacNum = num(form.ltv) != null && num(form.cac) != null && num(form.cac)! > 0
    ? num(form.ltv)! / num(form.cac)!
    : null
  const ltvCac = ltvCacNum != null ? ltvCacNum.toFixed(1) : '—'

  function handleSubmit() {
    if (!form.period) { setError('Period is required'); return }
    setError('')
    startTransition(async () => {
      try {
        await logUnitEconomics({
          companyId, period: form.period,
          cac: num(form.cac), ltv: num(form.ltv),
          cacPaybackMonths: num(form.cacPaybackMonths), arpa: num(form.arpa),
          acv: num(form.acv), newCacRatio: num(form.newCacRatio),
          smSpend: num(form.smSpend), newCustomers: ni(form.newCustomers),
        })
        setSuccess(true)
        setTimeout(() => { setOpen(false); setSuccess(false) }, 1200)
      } catch (e) { setError('Failed to save.'); console.error(e) }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {!isControlled && <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <TrendingUp size={12} />
          Unit Economics
        </button>
      </Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-32px)] sm:w-full max-w-md max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
            <div>
              <Dialog.Title className="text-[14px] font-semibold">Log Unit Economics</Dialog.Title>
              <p className="text-[11px] text-muted-foreground">{companyName}</p>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Close modal" className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button>
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
                { k: 'cac', label: 'CAC ($)' },
                { k: 'ltv', label: 'LTV ($)' },
                { k: 'cacPaybackMonths', label: 'CAC Payback (months)' },
                { k: 'arpa', label: 'ARPA ($/month)' },
                { k: 'acv', label: 'ACV ($/year)' },
                { k: 'newCacRatio', label: 'New CAC Ratio' },
                { k: 'smSpend', label: 'S&M Spend ($)' },
                { k: 'newCustomers', label: 'New Customers' },
              ].map(({ k, label }) => (
                <Field key={k} label={label}>
                  <input type="number" value={form[k as keyof typeof form]} onChange={(e) => s(k, e.target.value)} className="input w-full" />
                </Field>
              ))}
            </div>
            {ltvCacNum != null && (
              <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3 flex justify-between items-center">
                <span className="text-[12px] text-muted-foreground">LTV:CAC Ratio</span>
                <span className={cn('text-[14px] font-semibold tabular-nums',
                  ltvCacNum >= 3 ? 'text-emerald-400' : ltvCacNum >= 1 ? 'text-amber-400' : 'text-red-400'
                )}>{ltvCac}x</span>
              </div>
            )}
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            {success && <p className="text-[12px] text-emerald-400">✓ Saved</p>}
          </div>
          <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-background">
            <Dialog.Close asChild>
              <button className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
            </Dialog.Close>
            <button onClick={handleSubmit} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium transition-colors', pending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90')}>
              {pending ? 'Saving…' : 'Save'}
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
