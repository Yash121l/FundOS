'use client'

import { useTransition } from 'react'
import { ReportSectionCard } from './report-section'
import { markReportExported } from '@/lib/lp-report-actions'
import { formatDate } from '@fundos/shared'
import type { LPReportDetail } from '@/lib/lp-reports'

interface ReportViewerProps {
  report: LPReportDetail
}

const STATUS_STYLES: Record<string, string> = {
  GENERATING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  READY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  EXPORTED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ARCHIVED: 'bg-secondary/50 text-muted-foreground border-border',
}

export function ReportViewer({ report }: ReportViewerProps) {
  const [, startTransition] = useTransition()

  function handleExportMarkdown() {
    if (!report.markdownContent) return
    const blob = new Blob([report.markdownContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.title.replace(/\s+/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
    startTransition(async () => { await markReportExported(report.id) })
  }

  function handleExportPDF() {
    startTransition(async () => {
      await markReportExported(report.id)
      window.print()
    })
  }

  return (
    <div>
      {/* Toolbar — hidden in print */}
      <div className="flex items-center gap-3 mb-5 print:hidden">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[15px] font-semibold text-foreground">{report.title}</h1>
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[report.status] ?? ''}`}>
              {report.status}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {report.companies.length} companies · Generated {formatDate(report.createdAt)}
          </p>
        </div>
        <button
          onClick={handleExportMarkdown}
          className="h-8 px-3.5 rounded-md border border-border text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          ↓ Markdown
        </button>
        <button
          onClick={handleExportPDF}
          className="h-8 px-3.5 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
        >
          ↓ PDF / Print
        </button>
      </div>

      {/* Print header — only visible when printing */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {report.companies.length} portfolio companies · Generated {formatDate(report.createdAt)}
        </p>
        <hr className="mt-4" />
      </div>

      {/* Sections */}
      <div className="space-y-4 print:space-y-8">
        {report.sections.map((section) => (
          <ReportSectionCard key={section.id} section={section} reportId={report.id} />
        ))}
      </div>

      {/* Companies included */}
      {report.companies.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-4 print:hidden">
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Companies Included</p>
          <div className="flex flex-wrap gap-1.5">
            {report.companies.map((rc) => (
              <span key={rc.company.id} className="inline-flex items-center rounded-full border border-border bg-secondary/30 px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                {rc.company.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
