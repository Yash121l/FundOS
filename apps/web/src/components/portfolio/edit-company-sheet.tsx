'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, Settings } from 'lucide-react'
import { updateCompany } from '@/lib/portfolio-actions'
import { cn } from '@/lib/utils'

const SECTORS = ['SAAS', 'FINTECH', 'AI', 'DEVTOOLS', 'CLIMATETECH', 'HEALTHTECH', 'MARKETPLACE', 'INFRASTRUCTURE', 'OTHER']
const STAGES = ['PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'GROWTH']
const STAGE_LABELS: Record<string, string> = {
  PRE_SEED: 'Pre-seed', SEED: 'Seed', SERIES_A: 'Series A',
  SERIES_B: 'Series B', SERIES_C: 'Series C', GROWTH: 'Growth',
}

interface Company {
  id: string
  name: string
  sector: string
  stage: string
  country: string
  website: string | null
  foundedYear: number | null
  description: string | null
  status: string
  healthStatus: string
  logoUrl?: string | null
}

interface Props {
  company: Company
}

export function EditCompanySheet({ company }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: company.name,
    sector: company.sector,
    stage: company.stage,
    country: company.country,
    website: company.website ?? '',
    foundedYear: company.foundedYear?.toString() ?? '',
    description: company.description ?? '',
    status: company.status,
    healthStatus: company.healthStatus,
    logoUrl: company.logoUrl ?? '',
  })

  // reset when company changes
  useEffect(() => {
    setForm({
      name: company.name,
      sector: company.sector,
      stage: company.stage,
      country: company.country,
      website: company.website ?? '',
      foundedYear: company.foundedYear?.toString() ?? '',
      description: company.description ?? '',
      status: company.status,
      healthStatus: company.healthStatus,
      logoUrl: company.logoUrl ?? '',
    })
  }, [company])

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    setSuccess(false)
  }

  function handleSubmit() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setError('')
    startTransition(async () => {
      try {
        await updateCompany({
          id: company.id,
          ...form,
          foundedYear: form.foundedYear ? parseInt(form.foundedYear) : null,
        })
        setSuccess(true)
      } catch (e) {
        setError('Failed to update company.')
        console.error(e)
      }
    })
  }

  // close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Edit company"
        className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <Settings size={14} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-background border-l border-border z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-[14px] font-semibold">Edit Company</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <Field label="Company Name *">
                <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className="input w-full" />
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
                  <input type="text" value={form.country} onChange={(e) => set('country', e.target.value)} className="input w-full" />
                </Field>
                <Field label="Founded Year">
                  <input type="number" value={form.foundedYear} onChange={(e) => set('foundedYear', e.target.value)} className="input w-full" />
                </Field>
              </div>

              <Field label="Website">
                <input type="url" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://..." className="input w-full" />
              </Field>

              <Field label="Logo URL">
                <input type="url" value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://..." className="input w-full" />
              </Field>

              <Field label="Description">
                <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} className="input w-full resize-none" />
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
                <Field label="Health Status">
                  <select value={form.healthStatus} onChange={(e) => set('healthStatus', e.target.value)} className="input w-full">
                    <option value="HEALTHY">Healthy</option>
                    <option value="WATCHLIST">Watchlist</option>
                    <option value="AT_RISK">At Risk</option>
                  </select>
                </Field>
              </div>

              {error && <p className="text-[12px] text-red-400">{error}</p>}
              {success && <p className="text-[12px] text-emerald-400">✓ Changes saved</p>}
            </div>

            <div className="px-5 py-3.5 border-t border-border flex items-center justify-end gap-2">
              <button onClick={() => setOpen(false)} className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary transition-colors">
                Close
              </button>
              <button
                onClick={handleSubmit}
                disabled={pending}
                className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium transition-colors', pending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90')}
              >
                {pending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
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
