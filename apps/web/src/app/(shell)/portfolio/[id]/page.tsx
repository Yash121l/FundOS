import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getCompanyBySlug, getCompanySignals } from '@/lib/portfolio'
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

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params
  const company = await getCompanyBySlug(id)
  if (!company) notFound()

  const companySignals = await getCompanySignals(company.id)

  const metrics = company.metrics
  const latest = metrics[0] ?? null
  const prev = metrics[1] ?? null

  const healthBreakdown = metrics.length > 0 ? computeHealthScore(metrics) : null

  return (
    <Suspense fallback={<div className="p-5 text-[13px] text-muted-foreground">Loading company…</div>}>
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-background">
        <CompanyHeader company={company} latest={latest} prev={prev} />
        <div className="hidden md:block md:absolute md:top-4 md:right-5 print:hidden">
          <MeetingPrepButton companyId={company.id} companyName={company.name} />
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* MRR + Burn chart */}
        <MetricsChart data={metrics} />

        {/* Health score breakdown */}
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

        {/* Three-column layout: left (risks + opportunities + signals) | center (actions + tasks) | right (updates) */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-4 xl:grid-cols-[1fr_1fr_1fr]">
          {/* Column 1 */}
          <div className="space-y-4">
            <RisksSection risks={company.risks} />
            <OpportunitiesSection opportunities={company.opportunities} />
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <ActionsSection actions={company.actions} />
            <TasksSection tasks={company.tasks} />
            <SignalsSection signals={companySignals} />
          </div>

          {/* Column 3 — full width on smaller screens */}
          <div className="col-span-1 sm:col-span-2 xl:col-span-1">
            <UpdatesTimeline updates={company.updates} />
          </div>
        </div>
      </div>
    </div>
    </Suspense>
  )
}
