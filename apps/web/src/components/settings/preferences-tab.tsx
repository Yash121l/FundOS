'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const PREF_KEY = 'signalos_prefs'

interface Prefs {
  defaultPortfolioView: 'table' | 'grid'
  defaultSectorFilter: string
  itemsPerPage: number
  showHealthBadges: boolean
  compactMode: boolean
  defaultCurrency: string
}

const DEFAULTS: Prefs = {
  defaultPortfolioView: 'table',
  defaultSectorFilter: 'all',
  itemsPerPage: 25,
  showHealthBadges: true,
  compactMode: false,
  defaultCurrency: 'USD',
}

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { return DEFAULTS }
}

function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p))
  } catch (err) {
    console.error('[PreferencesTab] Failed to persist preferences:', err)
  }
}

function Toggle({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative flex-shrink-0 h-5 w-9 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-secondary'
        )}
      >
        <span className={cn(
          'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )} />
      </button>
    </div>
  )
}

export function PreferencesTab() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setPrefs(loadPrefs())
  }, [])

  function update<K extends keyof Prefs>(k: K, v: Prefs[K]) {
    const next = { ...prefs, [k]: v }
    setPrefs(next)
    savePrefs(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h2 className="text-[15px] font-semibold">Preferences</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Workspace display and behavior preferences. Saved to this browser.
        </p>
      </div>

      {/* Portfolio defaults */}
      <div>
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Portfolio</h3>
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Default View</label>
            <div className="flex gap-2">
              {(['table', 'grid'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => update('defaultPortfolioView', v)}
                  className={cn(
                    'h-7 px-3 rounded-md text-[12px] font-medium capitalize transition-colors',
                    prefs.defaultPortfolioView === v
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Default Sector Filter</label>
            <select
              value={prefs.defaultSectorFilter}
              onChange={(e) => update('defaultSectorFilter', e.target.value)}
              className="input w-full"
            >
              <option value="all">All Sectors</option>
              <option value="AI">AI</option>
              <option value="SAAS">SaaS</option>
              <option value="FINTECH">Fintech</option>
              <option value="DEVTOOLS">DevTools</option>
              <option value="CLIMATETECH">Climatetech</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Items Per Page</label>
            <select
              value={String(prefs.itemsPerPage)}
              onChange={(e) => update('itemsPerPage', parseInt(e.target.value))}
              className="input w-full"
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} companies</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Display toggles */}
      <div>
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Display</h3>
        <div className="rounded-xl border border-border bg-card px-4">
          <Toggle
            label="Health Status Badges"
            hint="Show Healthy / Watchlist / At Risk chips on portfolio cards"
            checked={prefs.showHealthBadges}
            onChange={(v) => update('showHealthBadges', v)}
          />
          <Toggle
            label="Compact Mode"
            hint="Reduce row height in portfolio table for higher information density"
            checked={prefs.compactMode}
            onChange={(v) => update('compactMode', v)}
          />
        </div>
      </div>

      {/* Currency */}
      <div>
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Currency</h3>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Display Currency</label>
            <select
              value={prefs.defaultCurrency}
              onChange={(e) => update('defaultCurrency', e.target.value)}
              className="input w-full"
            >
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="INR">INR — Indian Rupee</option>
            </select>
          </div>
        </div>
      </div>

      {saved && (
        <p className="text-[12px] text-emerald-400 fixed bottom-6 inset-x-0 sm:inset-x-auto sm:right-6 mx-auto sm:mx-0 w-fit bg-background border border-border rounded-lg px-3 py-2 shadow-lg">
          ✓ Preferences saved
        </p>
      )}
    </div>
  )
}
