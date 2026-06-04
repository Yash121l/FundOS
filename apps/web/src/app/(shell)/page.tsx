import {
  getHealthCounts,
  getFundMetrics,
  getAtRiskCompanies,
  getRecentUpdates,
  getActiveTrends,
  getRecentAlerts,
} from '@/lib/dashboard'
import { PortfolioHealthSummary } from '@/components/dashboard/portfolio-health-summary'
import { FundMetricsRow } from '@/components/dashboard/fund-metrics-row'
import { AtRiskPanel } from '@/components/dashboard/at-risk-panel'
import { RecentUpdatesPanel } from '@/components/dashboard/recent-updates-panel'
import { TrendsSummaryPanel } from '@/components/dashboard/trends-summary-panel'
import { HealthDonutChart } from '@/components/dashboard/health-chart'
import { RecentAlertsPanel } from '@/components/dashboard/recent-alerts-panel'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [healthCounts, fundMetrics, atRiskCompanies, recentUpdates, activeTrends, recentAlerts] =
    await Promise.all([
      getHealthCounts(),
      getFundMetrics(),
      getAtRiskCompanies(),
      getRecentUpdates(5),
      getActiveTrends(4),
      getRecentAlerts(6),
    ])

  return (
    <div className="p-5 space-y-4 max-w-[1440px]">

      {/* ── Row 1: Health summary + Fund metrics ─────────────── */}
      <div className="flex gap-3 items-stretch">
        <PortfolioHealthSummary data={healthCounts} />
        <FundMetricsRow data={fundMetrics} />
      </div>

      {/* ── Row 2: Main grid ──────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_300px] gap-4">

        {/* Left column: At-risk + Recent updates */}
        <div className="space-y-4 min-w-0">
          <AtRiskPanel companies={atRiskCompanies} />
          <RecentUpdatesPanel updates={recentUpdates} />
        </div>

        {/* Right column: Chart + Trends + Alerts */}
        <div className="space-y-4">
          <HealthDonutChart data={healthCounts} />
          <TrendsSummaryPanel trends={activeTrends} />
          <RecentAlertsPanel alerts={recentAlerts} />
        </div>
      </div>

      {/* ── Footer timestamp ──────────────────────────────────── */}
      <p className="text-[11px] text-muted-foreground/40 pb-1">
        Live data from portfolio database · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>
    </div>
  )
}
