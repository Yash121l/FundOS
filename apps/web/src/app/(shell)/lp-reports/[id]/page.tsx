import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLPReportById } from '@/lib/lp-reports'
import { ReportViewer } from '@/components/lp-reports/report-viewer'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LPReportDetailPage({ params }: Props) {
  const { id } = await params
  const report = await getLPReportById(id)
  if (!report) notFound()

  return (
    <div className="p-5 max-w-4xl print:p-0 print:max-w-none">
      {/* Breadcrumb — hidden in print */}
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-5 print:hidden">
        <Link href="/lp-reports" className="hover:text-foreground transition-colors">LP Reports</Link>
        <span>›</span>
        <span className="text-foreground">{report.title}</span>
      </div>

      <ReportViewer report={report} />
    </div>
  )
}
