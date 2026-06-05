import { Suspense } from 'react'
import { getMonitoringDashboard } from '@/lib/monitoring-actions'
import { MonitoringDashboardView } from '@/components/monitoring/monitoring-dashboard'

export const dynamic = 'force-dynamic'

async function MonitoringContent() {
  const now = new Date()
  const reportingYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const reportingMonthNum = now.getMonth() === 0 ? 12 : now.getMonth()
  const dueDateThisMonth = new Date(now.getFullYear(), now.getMonth(), 10, 23, 59, 59)

  const data = await getMonitoringDashboard().catch(() => ({
    complianceRows: [],
    escalations: [],
    submittedCount: 0,
    lateCount: 0,
    totalCompanies: 0,
    reportingPeriod: `${reportingYear}-${String(reportingMonthNum).padStart(2, '0')}`,
    dueDateThisMonth,
    isPastDue: now > dueDateThisMonth,
  }))

  return <MonitoringDashboardView data={data} />
}

export default function MonitoringPage() {
  return (
    <Suspense fallback={<div className="p-5 text-[12px] text-muted-foreground animate-pulse">Loading monitoring dashboard…</div>}>
      <MonitoringContent />
    </Suspense>
  )
}
