'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, BarChart3 } from 'lucide-react'
import { logMetricSnapshot } from '@/lib/portfolio-actions'
import { getPeriodOptions } from '@fundos/shared'
import { cn } from '@/lib/utils'

interface Props {
  companyId: string
  companyName: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function LogMetricsModal({ companyId, companyName, open: openProp, onOpenChange: onChangeProp }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp! : internalOpen
  const setOpen = isControlled ? (v: boolean) => onChangeProp?.(v) : setInternalOpen
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const periods = getPeriodOptions(12)

  const [form, setForm] = useState({
    period: periods[0] ?? '',
    mrr: '', burnRate: '', cashBalance: '', runway: '',
    grossMargin: '', nrr: '', grr: '', headcount: '',
  })

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    setSuccess(false)
  }

  function num(v: string): number | null {
    const n = parseFloat(v)
    return isNaN(n) ? null : n
  }

  function handleSubmit() {
    if (!form.period) { setError('Period is required'); return }
    setError('')
    startTransition(async () => {
      try {
        await logMetricSnapshot({
          companyId,
          period: form.period,
          mrr: num(form.mrr),
          burnRate: num(form.burnRate),
          cashBalance: num(form.cashBalance),
          runway: num(form.runway),
          grossMargin: num(form.grossMargin),
          nrr: num(form.nrr),
          grr: num(form.grr),
          headcount: num(form.headcount),
        })
        setSuccess(true)
        closeTimerRef.current = setTimeout(() => {
          setOpen(false)
          setSuccess(false)
        }, 1200)
      } catch (e) {
        setError('Failed to save metrics.')
        console.error(e)
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {!isControlled && <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <BarChart3 size={12} />
          Log Metrics
        </button>
      </Dialog.Trigger>}

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-32px)] sm:w-full max-w-md max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
            <div>
              <Dialog.Title className="text-[14px] font-semibold">Log Metrics</Dialog.Title>
              <p className="text-[11px] text-muted-foreground mt-0.5">{companyName}</p>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Close modal" className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-5 space-y-4">
            <Field label="Period">
              <select value={form.period} onChange={(e) => set('period', e.target.value)} className="input w-full">
                {periods.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="MRR ($)">
                <input type="number" value={form.mrr} onChange={(e) => set('mrr', e.target.value)} placeholder="150000" className="input w-full" />
              </Field>
              <Field label="Burn Rate ($)">
                <input type="number" value={form.burnRate} onChange={(e) => set('burnRate', e.target.value)} placeholder="80000" className="input w-full" />
              </Field>
              <Field label="Cash Balance ($)">
                <input type="number" value={form.cashBalance} onChange={(e) => set('cashBalance', e.target.value)} placeholder="2000000" className="input w-full" />
              </Field>
              <Field label="Runway (months)">
                <input type="number" value={form.runway} onChange={(e) => set('runway', e.target.value)} placeholder="auto" className="input w-full" />
              </Field>
              <Field label="Headcount">
                <input type="number" value={form.headcount} onChange={(e) => set('headcount', e.target.value)} placeholder="25" className="input w-full" />
              </Field>
              <Field label="Gross Margin (%)">
                <input type="number" value={form.grossMargin} onChange={(e) => set('grossMargin', e.target.value)} placeholder="72.5" className="input w-full" />
              </Field>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? '▲ Hide advanced' : '▼ Advanced (retention metrics)'}
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Field label="NRR (%)">
                  <input type="number" value={form.nrr} onChange={(e) => set('nrr', e.target.value)} placeholder="110" className="input w-full" />
                </Field>
                <Field label="GRR (%)">
                  <input type="number" value={form.grr} onChange={(e) => set('grr', e.target.value)} placeholder="88" className="input w-full" />
                </Field>
              </div>
            )}

            {error && <p className="text-[12px] text-red-400">{error}</p>}
            {success && <p className="text-[12px] text-emerald-400">✓ Metrics saved</p>}
          </div>

          <div className="px-5 py-3.5 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-background">
            <Dialog.Close asChild>
              <button className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleSubmit}
              disabled={pending}
              className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium transition-colors', pending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90')}
            >
              {pending ? 'Saving…' : 'Save Metrics'}
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
