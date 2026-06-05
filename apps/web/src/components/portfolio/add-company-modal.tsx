'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Plus } from 'lucide-react'
import { createCompany } from '@/lib/portfolio-actions'
import { cn } from '@/lib/utils'

const SECTORS = ['SAAS', 'FINTECH', 'AI', 'DEVTOOLS', 'CLIMATETECH', 'HEALTHTECH', 'MARKETPLACE', 'INFRASTRUCTURE', 'OTHER']
const STAGES = ['PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'GROWTH']
const STAGE_LABELS: Record<string, string> = {
  PRE_SEED: 'Pre-seed', SEED: 'Seed', SERIES_A: 'Series A',
  SERIES_B: 'Series B', SERIES_C: 'Series C', GROWTH: 'Growth',
}

export function AddCompanyModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '', sector: 'SAAS', stage: 'SEED', country: 'US',
    website: '', foundedYear: '', description: '', status: 'ACTIVE', healthStatus: 'HEALTHY',
  })

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleSubmit() {
    if (!form.name.trim()) { setError('Company name is required'); return }
    if (form.website) {
      try {
        const url = form.website.includes('://') ? form.website : `https://${form.website}`
        new URL(url)
      } catch {
        setError('Website must be a valid URL'); return
      }
    }
    setError('')
    startTransition(async () => {
      try {
        const parsedYear = form.foundedYear ? parseInt(form.foundedYear, 10) : null
        const foundedYear = parsedYear !== null && Number.isFinite(parsedYear) ? parsedYear : null
        const res = await createCompany({ ...form, foundedYear })
        setOpen(false)
        setForm({ name: '', sector: 'SAAS', stage: 'SEED', country: 'US', website: '', foundedYear: '', description: '', status: 'ACTIVE', healthStatus: 'HEALTHY' })
        router.push(`/portfolio/${res.slug}`)
      } catch (e) {
        setError('Failed to create company. Please try again.')
        console.error(e)
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors">
          <Plus size={13} />
          Add Company
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
            <Dialog.Title className="text-[14px] font-semibold">Add Portfolio Company</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-5 space-y-4">
            <Field label="Company Name *">
              <input
                autoFocus
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Acme Corp"
                className="input w-full"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Sector">
                <select value={form.sector} onChange={(e) => set('sector', e.target.value)} className="input w-full">
                  {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Stage">
                <select value={form.stage} onChange={(e) => set('stage', e.target.value)} className="input w-full">
                  {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Country">
                <input type="text" value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="US" className="input w-full" />
              </Field>
              <Field label="Founded Year">
                <input type="number" value={form.foundedYear} onChange={(e) => set('foundedYear', e.target.value)} placeholder="2020" className="input w-full" />
              </Field>
            </div>

            <Field label="Website">
              <input type="url" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://example.com" className="input w-full" />
            </Field>

            <Field label="Description">
              <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="One-line description of what the company does" className="input w-full resize-none" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input w-full">
                  <option value="ACTIVE">Active</option>
                  <option value="WATCH">Watch</option>
                  <option value="EXITED">Exited</option>
                  <option value="WRITTEN_OFF">Written Off</option>
                </select>
              </Field>
              <Field label="Initial Health">
                <select value={form.healthStatus} onChange={(e) => set('healthStatus', e.target.value)} className="input w-full">
                  <option value="HEALTHY">Healthy</option>
                  <option value="WATCHLIST">Watchlist</option>
                  <option value="AT_RISK">At Risk</option>
                </select>
              </Field>
            </div>

            {error && <p className="text-[12px] text-red-400">{error}</p>}
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
              {pending ? 'Creating…' : 'Create Company'}
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
