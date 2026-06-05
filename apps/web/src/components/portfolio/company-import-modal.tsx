'use client'

import { useState, useRef, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react'
import { downloadTemplate, parseCsv, COMPANY_IMPORT_HEADERS } from '@/lib/export-utils'
import { createCompany } from '@/lib/portfolio-actions'
import { cn } from '@/lib/utils'

const SECTORS = ['SAAS', 'FINTECH', 'AI', 'DEVTOOLS', 'CLIMATETECH', 'HEALTHTECH', 'MARKETPLACE', 'INFRASTRUCTURE', 'OTHER']
const STAGES = ['PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'GROWTH']

interface ParsedRow {
  name: string; sector: string; stage: string; country: string; website: string;
  foundedYear: string; description: string;
  error?: string; skip?: boolean;
}

function validateRow(raw: Record<string, string>): ParsedRow {
  const row: ParsedRow = {
    name: raw['name']?.trim() ?? '',
    sector: (raw['sector']?.trim().toUpperCase() ?? 'SAAS'),
    stage: (raw['stage']?.trim().toUpperCase().replace(/\s+/g, '_') ?? 'SEED'),
    country: raw['country']?.trim() || 'US',
    website: raw['website']?.trim() ?? '',
    foundedYear: raw['foundedYear']?.trim() ?? '',
    description: raw['description']?.trim() ?? '',
  }
  if (!row.name) row.error = 'Name is required'
  else if (!SECTORS.includes(row.sector)) row.error = `Invalid sector: ${row.sector}`
  else if (!STAGES.includes(row.stage)) row.error = `Invalid stage: ${row.stage}`
  return row
}

export function CompanyImportModal() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{ ok: number; failed: number }>({ ok: 0, failed: 0 })
  const [csvError, setCsvError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvError(null)
    const reader = new FileReader()
    reader.onerror = () => setCsvError('Failed to read file. Please try again.')
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const parsed = parseCsv(text).map(validateRow)
        setRows(parsed)
        setStep('preview')
      } catch {
        setCsvError('Could not parse CSV. Check that the file is valid UTF-8 text.')
      }
    }
    reader.readAsText(file)
  }

  function toggleSkip(i: number) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, skip: !r.skip } : r))
  }

  function handleImport() {
    const toImport = rows.filter((r) => !r.skip && !r.error)
    if (toImport.length === 0) return
    setStep('importing')
    setProgress(0)
    startTransition(async () => {
      const settlements = await Promise.allSettled(
        toImport.map(async (row, idx) => {
          const parsedYear = row.foundedYear ? parseInt(row.foundedYear, 10) : null
          const foundedYear = parsedYear !== null && Number.isFinite(parsedYear) ? parsedYear : null
          const result = await createCompany({
            name: row.name, sector: row.sector, stage: row.stage,
            country: row.country, website: row.website,
            foundedYear,
            description: row.description, status: 'ACTIVE', healthStatus: 'HEALTHY',
          })
          setProgress(idx + 1)
          return result
        })
      )
      const ok = settlements.filter((s) => s.status === 'fulfilled' && s.value?.success === true).length
      const failed = settlements.filter((s) => s.status === 'rejected' || (s.status === 'fulfilled' && s.value?.success === false)).length
      setResults({ ok, failed })
      setStep('done')
    })
  }

  function reset() {
    setRows([])
    setStep('upload')
    setProgress(0)
    setResults({ ok: 0, failed: 0 })
    setCsvError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Upload size={13} />
          Import
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-32px)] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
            <Dialog.Title className="text-[14px] font-semibold">Bulk Import Companies</Dialog.Title>
            <Dialog.Close asChild><button className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button></Dialog.Close>
          </div>

          <div className="p-5">
            {step === 'upload' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-muted-foreground">Download the template, fill it in, then upload your CSV.</p>
                  <button onClick={() => downloadTemplate(COMPANY_IMPORT_HEADERS, 'signalos-company-template.csv')} className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <Download size={12} /> Template
                  </button>
                </div>
                {csvError && (
                  <p className="flex items-center gap-1.5 text-[12px] text-red-400"><AlertCircle size={12} />{csvError}</p>
                )}
                <label className="block">
                  <div className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors p-8 text-center cursor-pointer">
                    <Upload size={24} className="text-muted-foreground mx-auto mb-2" />
                    <p className="text-[13px] font-medium">Click to upload CSV</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Columns: {COMPANY_IMPORT_HEADERS.join(', ')}</p>
                  </div>
                  <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="sr-only" />
                </label>
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-muted-foreground">{rows.filter((r) => !r.error).length} valid rows, {rows.filter((r) => !!r.error).length} with errors</p>
                  <button onClick={reset} className="text-[12px] text-muted-foreground hover:text-foreground">← Start over</button>
                </div>
                <div className="rounded-xl border border-border overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="sticky top-0"><tr className="bg-secondary/40 border-b border-border">
                      <th className="py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                      <th className="py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sector</th>
                      <th className="py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stage</th>
                      <th className="py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="py-2 px-3" />
                    </tr></thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className={cn('border-b border-border/40 last:border-0', row.skip ? 'opacity-40' : '', row.error ? 'bg-red-500/5' : '')}>
                          <td className="px-3 py-2 text-[12px]">{row.name || '(empty)'}</td>
                          <td className="px-3 py-2 text-[11px] text-muted-foreground">{row.sector}</td>
                          <td className="px-3 py-2 text-[11px] text-muted-foreground">{row.stage}</td>
                          <td className="px-3 py-2">
                            {row.error
                              ? <span className="flex items-center gap-1 text-[11px] text-red-400"><AlertCircle size={11} />{row.error}</span>
                              : <span className="flex items-center gap-1 text-[11px] text-emerald-400"><CheckCircle size={11} />Valid</span>
                            }
                          </td>
                          <td className="px-3 py-2">
                            {!row.error && (
                              <button onClick={() => toggleSkip(i)} className="text-[11px] text-muted-foreground hover:text-foreground">
                                {row.skip ? 'Include' : 'Skip'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={reset} className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">Cancel</button>
                  <button onClick={handleImport} disabled={rows.filter((r) => !r.skip && !r.error).length === 0} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', 'hover:bg-primary/90 disabled:opacity-50')}>
                    {`Import ${rows.filter((r) => !r.skip && !r.error).length} companies`}
                  </button>
                </div>
              </div>
            )}

            {step === 'importing' && (
              <div className="text-center py-6 space-y-3">
                <p className="text-[14px] font-medium animate-pulse">Importing companies…</p>
                <p className="text-[13px] text-muted-foreground">{progress} of {rows.filter((r) => !r.skip && !r.error).length} done</p>
              </div>
            )}

            {step === 'done' && (
              <div className="text-center py-6 space-y-3">
                <CheckCircle size={32} className="text-emerald-400 mx-auto" />
                <p className="text-[14px] font-medium">Import complete</p>
                <p className="text-[13px] text-muted-foreground">{results.ok} companies created{results.failed > 0 ? `, ${results.failed} failed` : ''}.</p>
                <Dialog.Close asChild>
                  <button className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90">Done</button>
                </Dialog.Close>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
