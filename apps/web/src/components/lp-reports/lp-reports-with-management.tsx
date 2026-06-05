'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatDate } from '@fundos/shared'
import type { LPReportListItem } from '@/lib/lp-reports'
import type { LPManagementData } from '@/lib/lp-management-actions'
import { LPManagementView } from '@/components/lp-management/lp-management-view'

const TABS = ['LP Reports', 'LP Management'] as const
type Tab = typeof TABS[number]

const STATUS_STYLES: Record<string, string> = {
  GENERATING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  READY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  EXPORTED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ARCHIVED: 'bg-secondary/50 text-muted-foreground border-border',
}

interface Props {
  reports: LPReportListItem[]
  lpData: LPManagementData
  canManageLPs?: boolean
}

export function LPReportsWithManagement({ reports, lpData, canManageLPs = true }: Props) {
  const [tab, setTab] = useState<Tab>('LP Reports')
  const tabs = canManageLPs ? TABS : (['LP Reports'] as const)

  return (
    <div className="p-5 max-w-[1440px] w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[15px] font-semibold text-foreground">
            {canManageLPs ? 'LP Reports & Management' : 'LP Reports'}
          </h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {canManageLPs
              ? 'Quarterly reports, LP onboarding, capital calls, distributions, and LPAC'
              : 'Quarterly and annual reports shared by your fund team'}
          </p>
        </div>
        {canManageLPs && tab === 'LP Reports' && (
          <Link
            href="/lp-reports/new"
            className="h-8 px-3.5 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
          >
            + New Report
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-5">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
            {t === 'LP Management' && lpData.lpEntities.length > 0 && (
              <span className="ml-2 text-[10px] tabular-nums font-semibold bg-primary/15 text-primary px-1.5 py-px rounded-full">
                {lpData.lpEntities.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* LP Reports tab */}
      {tab === 'LP Reports' && (
        <>
          {reports.length === 0 ? (
            <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
              <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center mb-3 text-lg">📄</div>
              <p className="text-[13px] font-medium text-foreground">No reports yet</p>
              <p className="text-[12px] text-muted-foreground mt-1 mb-4">Generate your first LP report to share with investors.</p>
              {canManageLPs && (
                <Link href="/lp-reports/new" className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors">
                  Generate Report
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border bg-card">
                {['Report', 'Quarter', 'Companies', 'Status', ''].map((col) => (
                  <p key={col} className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">{col}</p>
                ))}
              </div>
              {reports.map((report) => (
                <div key={report.id} className="flex flex-col sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:gap-4 px-4 py-3.5 border-b border-border last:border-0 sm:items-center hover:bg-secondary/20 transition-colors gap-1">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{report.title}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(report.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 sm:block">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 sm:hidden">Quarter:</span>
                    <p className="text-[12px] sm:text-[13px] text-foreground tabular-nums">{report.quarter}</p>
                  </div>
                  <div className="flex items-center gap-1.5 sm:block">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 sm:hidden">Companies:</span>
                    <p className="text-[12px] sm:text-[13px] text-foreground tabular-nums">{report.companies.length}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold w-fit ${STATUS_STYLES[report.status] ?? ''}`}>
                    {report.status}
                  </span>
                  <Link href={`/lp-reports/${report.id}`} className="h-7 px-3 rounded-md border border-border text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors whitespace-nowrap self-start sm:self-auto mt-1 sm:mt-0">
                    View →
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* LP Reporting Schedule */}
          <div className="mt-5 rounded-xl border border-border bg-card p-4">
            <p className="text-[12px] font-semibold text-foreground mb-3">LP Reporting Schedule</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { freq: 'Quarterly', title: 'LP Quarterly Report', items: ['Portfolio company summaries', 'NAV update per company', 'Capital deployment status', 'Fund pipeline highlight', 'Fund metrics snapshot (DPI, TVPI)'] },
                { freq: 'Annual', title: 'Annual LP Report', items: ['Audited fund financials', 'IRR / MOIC / DPI / TVPI', 'Full portfolio deep-dive', 'GP strategy and fund outlook', 'Carry and fee reconciliation'] },
                { freq: 'On Capital Call', title: 'Capital Call Notice', items: ['Investment target & rationale', 'Pro-rata amount per LP', 'Wire instructions + bank details', 'Payment due: 10–15 business days'] },
                { freq: 'On Exit', title: 'Exit & Distribution Notice', items: ['Exit details (acquirer / IPO price)', 'Gross proceeds & timeline', 'Distribution waterfall calculation', 'Net proceeds per LP after carry', 'Tax documentation'] },
              ].map(({ freq, title, items }) => (
                <div key={freq} className="rounded-lg border border-border bg-secondary/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center rounded border border-border bg-secondary px-2 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                      {freq}
                    </span>
                    <p className="text-[11px] font-medium text-foreground">{title}</p>
                  </div>
                  <ul className="space-y-0.5">
                    {items.map((item) => (
                      <li key={item} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <span className="text-muted-foreground/50 mt-px">›</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* LP Management tab */}
      {tab === 'LP Management' && <LPManagementView data={lpData} />}
    </div>
  )
}
