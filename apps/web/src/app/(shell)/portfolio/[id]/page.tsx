import { notFound } from 'next/navigation'
import { getCompanyBySlug, getCompanySignals } from '@/lib/portfolio'
import { getFinancialStatements, getSaasMetrics } from '@/lib/financial'
import { getCompanyInvestments, getCapTable } from '@/lib/investment'
import { computeHealthScore } from '@fundos/analytics'
import { CompanyHeader } from '@/components/portfolio/company-header'
import { MetricsChart } from '@/components/portfolio/metrics-chart'
import { RisksSection } from '@/components/portfolio/risks-section'
import { OpportunitiesSection } from '@/components/portfolio/opportunities-section'
import { ActionsSection } from '@/components/portfolio/actions-section'
import { TasksSection } from '@/components/portfolio/tasks-section'
import { UpdatesTimeline } from '@/components/portfolio/updates-timeline'
import { SignalsSection } from '@/components/portfolio/signals-section'
import { MeetingPrepButton } from '@/components/portfolio/meeting-prep-button'
import { LogMetricsModal } from '@/components/portfolio/log-metrics-modal'
import { EditCompanySheet } from '@/components/portfolio/edit-company-sheet'
import { LogMrrBridgeModal } from '@/components/financials/log-mrr-bridge-modal'
import { LogUnitEconomicsModal } from '@/components/financials/log-unit-economics-modal'
import { SaasMetricsSection } from '@/components/financials/saas-metrics-section'
import { FinancialStatementsView } from '@/components/financials/financial-statements-view'
import { InvestmentSection } from '@/components/investments/investment-section'
import { CapTableSection } from '@/components/cap-table/cap-table-section'
import { CompanyDetailTabs } from '@/components/portfolio/company-detail-tabs'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function CompanyDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab = 'overview' } = await searchParams

  const company = await getCompanyBySlug(id)
  if (!company) notFound()

  const [companySignals, statements, saas, investments, capTable] = await Promise.all([
    getCompanySignals(company.id),
    getFinancialStatements(company.id),
    getSaasMetrics(company.id),
    getCompanyInvestments(company.id),
    getCapTable(company.id),
  ])

  const metrics = company.metrics
  const latest = metrics[0] ?? null
  const prev = metrics[1] ?? null

  const healthBreakdown = metrics.length > 0 ? computeHealthScore(metrics) : null

  return (
    <div className="flex flex-col">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background">
          <CompanyHeader company={company} latest={latest} prev={prev} />
          <div className="hidden md:flex md:absolute md:top-3 md:right-5 print:hidden items-center gap-2">
            <LogMetricsModal companyId={company.id} companyName={company.name} />
            <LogMrrBridgeModal companyId={company.id} companyName={company.name} />
            <LogUnitEconomicsModal companyId={company.id} companyName={company.name} />
            <MeetingPrepButton companyId={company.id} companyName={company.name} />
            <EditCompanySheet company={company} />
          </div>
        </div>

        {/* Tab navigation */}
        <div className="px-5 pt-4">
          <CompanyDetailTabs companySlug={company.slug} activeTab={tab} />
        </div>

        <div className="p-5 space-y-4">
          {/* ── Overview tab ── */}
          {tab === 'overview' && (
            <>
              <MetricsChart data={metrics} />

              {healthBreakdown && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[13px] font-medium mb-3">Health Score Breakdown</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Growth', score: healthBreakdown.components.growth, weight: '35%' },
                      { label: 'Revenue Trend', score: healthBreakdown.components.revenueTrend, weight: '25%' },
                      { label: 'Runway', score: healthBreakdown.components.runway, weight: '25%' },
                      { label: 'Burn Efficiency', score: healthBreakdown.components.burnEfficiency, weight: '15%' },
                    ].map(({ label, score, weight }) => (
                      <div key={label} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-muted-foreground">{label}</p>
                          <p className="text-[10px] text-muted-foreground/50">{weight}</p>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${score}%`,
                              backgroundColor: score >= 65 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171',
                            }}
                          />
                        </div>
                        <p className="text-sm font-semibold tabular-nums" style={{
                          color: score >= 65 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171',
                        }}>
                          {score}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-4 xl:grid-cols-[1fr_1fr_1fr]">
                <div className="space-y-4">
                  <RisksSection risks={company.risks} />
                  <OpportunitiesSection opportunities={company.opportunities} />
                </div>
                <div className="space-y-4">
                  <ActionsSection actions={company.actions} />
                  <TasksSection tasks={company.tasks} />
                  <SignalsSection signals={companySignals} />
                </div>
                <div className="col-span-1 sm:col-span-2 xl:col-span-1">
                  <UpdatesTimeline updates={company.updates} />
                </div>
              </div>
            </>
          )}

          {/* ── SaaS Metrics tab ── */}
          {tab === 'saas' && (
            <SaasMetricsSection saas={saas} />
          )}

          {/* ── Financials tab ── */}
          {tab === 'financials' && (
            <FinancialStatementsView
              companyId={company.id}
              statements={statements}
            />
          )}

          {/* ── Investments tab ── */}
          {tab === 'investments' && (
            <InvestmentSection companyId={company.id} investments={investments} />
          )}

          {/* ── Cap Table tab ── */}
          {tab === 'captable' && (
            <CapTableSection companyId={company.id} capTable={capTable} />
          )}
        </div>
    </div>
  )
}
