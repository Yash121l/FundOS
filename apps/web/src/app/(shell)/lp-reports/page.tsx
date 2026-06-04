import Link from 'next/link'
import { getLPReports } from '@/lib/lp-reports'
import { formatDate } from '@fundos/shared'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  GENERATING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  READY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  EXPORTED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ARCHIVED: 'bg-secondary/50 text-muted-foreground border-border',
}

export default async function LPReportsPage() {
  const reports = await getLPReports().catch(() => [])

  return (
    <div className="p-5 max-w-[1440px] w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[15px] font-semibold text-foreground">LP Reports</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Generate quarterly investor reports from live portfolio data
          </p>
        </div>
        <Link
          href="/lp-reports/new"
          className="h-8 px-3.5 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
        >
          + New Report
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center mb-3 text-lg">📄</div>
          <p className="text-[13px] font-medium text-foreground">No reports yet</p>
          <p className="text-[12px] text-muted-foreground mt-1 mb-4">Generate your first LP report to share with investors.</p>
          <Link href="/lp-reports/new" className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors">
            Generate Report
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border bg-card">
            {['Report', 'Quarter', 'Companies', 'Status', ''].map((col) => (
              <p key={col} className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">{col}</p>
            ))}
          </div>
          {reports.map((report) => (
            <div key={report.id} className="flex flex-col gap-2 sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:gap-4 px-4 py-3.5 border-b border-border last:border-0 items-start sm:items-center hover:bg-secondary/20 transition-colors">
              <div>
                <p className="text-[13px] font-medium text-foreground">{report.title}</p>
                <p className="text-[11px] text-muted-foreground">{formatDate(report.createdAt)}</p>
              </div>
              <p className="text-[13px] text-foreground tabular-nums">{report.quarter}</p>
              <p className="text-[13px] text-foreground tabular-nums">{report.companies.length}</p>
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold w-fit ${STATUS_STYLES[report.status] ?? ''}`}>
                {report.status}
              </span>
              <Link href={`/lp-reports/${report.id}`} className="h-7 px-3 rounded-md border border-border text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors whitespace-nowrap">
                View →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
