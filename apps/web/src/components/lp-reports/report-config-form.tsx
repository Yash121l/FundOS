'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateReport } from '@/lib/lp-report-actions'
import type { CompanyForReport } from '@/lib/lp-reports'

interface ReportConfigFormProps {
  quarters: string[]
  companies: CompanyForReport[]
}

const TONE_OPTIONS = [
  { value: 'STANDARD', label: 'Standard', desc: 'Balanced and objective' },
  { value: 'GROWTH_FOCUSED', label: 'Growth-Focused', desc: 'Emphasises momentum and upside' },
  { value: 'CONSERVATIVE', label: 'Conservative', desc: 'Risk-aware, measured tone' },
] as const

const STATUS_BADGE: Record<string, string> = {
  HEALTHY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  WATCHLIST: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  AT_RISK: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const LP_PRIORITIES = [
  'Growth trajectory',
  'Downside protection',
  'ESG exposure',
  'DPI timeline',
  'Follow-on reserves',
  'Sector diversification',
]

const ALL_SECTORS = ['SAAS', 'FINTECH', 'AI', 'DEVTOOLS', 'CLIMATETECH', 'HEALTHTECH', 'MARKETPLACE', 'INFRASTRUCTURE']

export function ReportConfigForm({ quarters, companies }: ReportConfigFormProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [quarter, setQuarter] = useState(quarters[0] ?? '')
  const [tone, setTone] = useState<'STANDARD' | 'CONSERVATIVE' | 'GROWTH_FOCUSED'>('STANDARD')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(companies.map((c) => c.id)))
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLpProfile, setShowLpProfile] = useState(false)
  const [lpName, setLpName] = useState('')
  const [lpPriorities, setLpPriorities] = useState<Set<string>>(new Set())
  const [lpSectors, setLpSectors] = useState<Set<string>>(new Set())

  function toggleCompany(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === companies.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(companies.map((c) => c.id)))
  }

  function handleGenerate() {
    if (!quarter) { setError('Select a quarter.'); return }
    if (selectedIds.size === 0) { setError('Select at least one company.'); return }
    setError(null)
    setGenerating(true)

    const lpProfile =
      showLpProfile && (lpName.trim() || lpPriorities.size > 0 || lpSectors.size > 0)
        ? {
            name: lpName.trim(),
            priorities: [...lpPriorities],
            focusSectors: [...lpSectors],
          }
        : undefined

    startTransition(async () => {
      try {
        const result = await generateReport({
          quarter,
          companyIds: [...selectedIds],
          tone,
          lpProfile,
        })
        router.push(`/lp-reports/${result.reportId}`)
      } catch (err) {
        console.error('[generateReport] failed', err)
        setError('Report generation failed. Please try again.')
        setGenerating(false)
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Quarter */}
      <div>
        <label htmlFor="quarter-select" className="block text-[12px] font-medium text-muted-foreground mb-1.5">Reporting Quarter</label>
        <select id="quarter-select" value={quarter} onChange={(e) => setQuarter(e.target.value)} className="input w-full max-w-xs">
          {quarters.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
      </div>

      {/* Tone */}
      <div>
        <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Report Tone</label>
        <div className="flex gap-2">
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTone(opt.value)}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                tone === opt.value
                  ? 'border-ring bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              <p className="text-[12px] font-medium">{opt.label}</p>
              <p className="text-[11px] opacity-70 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Company selector */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[12px] font-medium text-muted-foreground">
            Companies ({selectedIds.size} of {companies.length} selected)
          </label>
          <button onClick={toggleAll} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            {selectedIds.size === companies.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="rounded-xl border border-border bg-card divide-y divide-border max-h-72 overflow-y-auto">
          {companies.map((c) => (
            <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-secondary/30 transition-colors">
              <input
                type="checkbox"
                aria-labelledby={`company-name-${c.id}`}
                checked={selectedIds.has(c.id)}
                onChange={() => toggleCompany(c.id)}
                className="accent-primary flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p id={`company-name-${c.id}`} className="text-[13px] font-medium text-foreground truncate">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">{c.sector} · {c.stage}</p>
              </div>
              <span className={`text-[10px] font-semibold rounded-md border px-1.5 py-0.5 flex-shrink-0 ${STATUS_BADGE[c.healthStatus] ?? ''}`}>
                {c.healthScore}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* LP Profile */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowLpProfile((v) => !v)}
          aria-expanded={showLpProfile}
          aria-controls="lp-profile-content"
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
        >
          <div className="text-left">
            <p className="text-[12px] font-medium text-foreground">LP Profile</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {showLpProfile ? 'Personalise the report for a specific LP' : 'Optional — personalise for a specific investor'}
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground">{showLpProfile ? '−' : '+'}</span>
        </button>

        {showLpProfile && (
          <div id="lp-profile-content" className="border-t border-border px-4 py-4 space-y-4 bg-secondary/10">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">LP Name</label>
              <input
                type="text"
                placeholder="e.g. Sequoia Capital, Tiger Global…"
                value={lpName}
                onChange={(e) => setLpName(e.target.value)}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Key Priorities</label>
              <div className="flex flex-wrap gap-1.5">
                {LP_PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setLpPriorities((prev) => {
                        const next = new Set(prev)
                        if (next.has(p)) next.delete(p)
                        else next.add(p)
                        return next
                      })
                    }
                    className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                      lpPriorities.has(p)
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary/50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Focus Sectors</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_SECTORS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setLpSectors((prev) => {
                        const next = new Set(prev)
                        if (next.has(s)) next.delete(s)
                        else next.add(s)
                        return next
                      })
                    }
                    className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                      lpSectors.has(s)
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary/50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[12px] text-destructive">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={generating || selectedIds.size === 0}
        className="h-9 px-6 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {generating ? 'Generating Report…' : 'Generate Report'}
      </button>

      {generating && (
        <div className="text-[12px] text-muted-foreground space-y-1">
          <p>⏳ Fetching portfolio data…</p>
          <p>✍️ Generating report sections…</p>
          <p className="text-muted-foreground/50">This takes a few seconds</p>
        </div>
      )}
    </div>
  )
}
