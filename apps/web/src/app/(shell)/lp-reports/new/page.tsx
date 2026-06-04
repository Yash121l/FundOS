import Link from 'next/link'
import { getCompaniesForReport, getQuarterOptions } from '@/lib/lp-reports'
import { ReportConfigForm } from '@/components/lp-reports/report-config-form'

export const dynamic = 'force-dynamic'

export default async function NewLPReportPage() {
  const [companies, quarters] = await Promise.all([
    getCompaniesForReport().catch(() => []),
    Promise.resolve(getQuarterOptions()),
  ])

  return (
    <div className="p-5">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-1">
          <Link href="/lp-reports" className="hover:text-foreground transition-colors">LP Reports</Link>
          <span>›</span>
          <span className="text-foreground">New Report</span>
        </div>
        <h1 className="text-[15px] font-semibold text-foreground">Generate LP Report</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Select a quarter and companies — the report generates in seconds
        </p>
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-[13px] font-medium text-foreground">No companies found</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Run <code className="px-1 py-0.5 rounded bg-secondary text-[11px]">pnpm db:seed</code> to add portfolio companies.
          </p>
        </div>
      ) : (
        <ReportConfigForm quarters={quarters} companies={companies} />
      )}
    </div>
  )
}
