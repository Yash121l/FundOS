import type {
  PortfolioAnalystInput,
  PortfolioAnalystOutput,
  MetricSnapshot,
  Severity,
  RiskCategory,
  RiskStatus,
  OpportunityStatus,
  Priority,
  ActionStatus,
} from '@fundos/types'

type RiskOut = PortfolioAnalystOutput['risks'][number]
type OpportunityOut = PortfolioAnalystOutput['opportunities'][number]
type ActionOut = PortfolioAnalystOutput['suggestedActions'][number]

export class PortfolioAnalyst {
  async analyze(input: PortfolioAnalystInput): Promise<PortfolioAnalystOutput> {
    const { company, latestUpdate, metricsHistory } = input
    const latest = metricsHistory[0] ?? null

    const risks = this.detectRisks(latest, latestUpdate.risks)
    const opportunities = this.detectOpportunities(latest, latestUpdate.wins)
    const suggestedActions = this.suggestActions(risks)
    const healthSummary = this.generateSummary(company.name, latestUpdate, latest, risks)

    return { healthSummary, risks, opportunities, suggestedActions }
  }

  private detectRisks(metrics: MetricSnapshot | null, riskNarrative: string): RiskOut[] {
    const risks: RiskOut[] = []

    if (metrics) {
      // Burn / Runway risks
      if (metrics.runway != null) {
        if (metrics.runway < 6) {
          risks.push({
            title: 'Critical Runway — Under 6 Months',
            description: `Current runway of ${Math.floor(metrics.runway)} months requires immediate fundraising or cost reduction action.`,
            severity: 'CRITICAL' as Severity,
            category: 'BURN' as RiskCategory,
            source: 'metrics',
            status: 'OPEN' as RiskStatus,
          })
        } else if (metrics.runway < 12) {
          risks.push({
            title: 'Runway Below 12 Months',
            description: `Runway of ${Math.floor(metrics.runway)} months warrants close monitoring and proactive fundraising conversations.`,
            severity: 'HIGH' as Severity,
            category: 'BURN' as RiskCategory,
            source: 'metrics',
            status: 'OPEN' as RiskStatus,
          })
        }
      }

      // Revenue growth risks
      if (metrics.revenueGrowthMom != null) {
        if (metrics.revenueGrowthMom < -0.05) {
          risks.push({
            title: 'Revenue Declining MoM',
            description: `MoM revenue growth of ${(metrics.revenueGrowthMom * 100).toFixed(1)}% indicates contraction that needs investigation.`,
            severity: 'HIGH' as Severity,
            category: 'REVENUE' as RiskCategory,
            source: 'metrics',
            status: 'OPEN' as RiskStatus,
          })
        } else if (metrics.revenueGrowthMom < 0) {
          risks.push({
            title: 'Negative Revenue Growth',
            description: `MoM growth of ${(metrics.revenueGrowthMom * 100).toFixed(1)}% — slight contraction worth tracking over next 2 periods.`,
            severity: 'MEDIUM' as Severity,
            category: 'REVENUE' as RiskCategory,
            source: 'metrics',
            status: 'OPEN' as RiskStatus,
          })
        }
      }

      // Burn efficiency
      if (metrics.burnRate != null && metrics.mrr != null && metrics.mrr > 0) {
        const ratio = metrics.burnRate / metrics.mrr
        if (ratio > 3) {
          risks.push({
            title: 'High Burn Multiple',
            description: `Burn-to-MRR ratio of ${ratio.toFixed(1)}x is above healthy threshold. Consider cost optimisation or accelerating revenue growth.`,
            severity: ratio > 5 ? ('HIGH' as Severity) : ('MEDIUM' as Severity),
            category: 'BURN' as RiskCategory,
            source: 'metrics',
            status: 'OPEN' as RiskStatus,
          })
        }
      }
    }

    // Risk from narrative (surface if founder flagged risks)
    if (riskNarrative && riskNarrative.trim().length > 20) {
      risks.push({
        title: 'Founder-Flagged Risk',
        description: riskNarrative.length > 200 ? `${riskNarrative.slice(0, 200)}…` : riskNarrative,
        severity: 'MEDIUM' as Severity,
        category: 'OPERATIONAL' as RiskCategory,
        source: 'founder_update',
        status: 'OPEN' as RiskStatus,
      })
    }

    return risks
  }

  private detectOpportunities(metrics: MetricSnapshot | null, winsNarrative: string): OpportunityOut[] {
    const opportunities: OpportunityOut[] = []

    if (metrics) {
      // Strong growth → fundraising signal
      if (metrics.revenueGrowthMom != null && metrics.revenueGrowthMom >= 0.15) {
        opportunities.push({
          title: 'Strong Growth Momentum — Fundraising Window',
          description: `${(metrics.revenueGrowthMom * 100).toFixed(1)}% MoM growth creates a compelling narrative for a growth round.`,
          category: 'FUNDRAISING',
          status: 'OPEN' as OpportunityStatus,
        })
      }

      // Healthy runway + growing → expansion
      if (metrics.runway != null && metrics.runway >= 18 && metrics.revenueGrowthMom != null && metrics.revenueGrowthMom > 0.05) {
        opportunities.push({
          title: 'Runway Strength Enables Aggressive Expansion',
          description: `With ${Math.floor(metrics.runway)} months of runway and positive growth, company is well-positioned to invest in expansion.`,
          category: 'GROWTH',
          status: 'OPEN' as OpportunityStatus,
        })
      }

      // NRR expansion signal
      if (metrics.nrr != null && metrics.nrr > 110) {
        opportunities.push({
          title: 'Net Revenue Retention Indicates Expansion Potential',
          description: `NRR of ${metrics.nrr}% shows strong upsell/expansion dynamics worth leaning into.`,
          category: 'REVENUE',
          status: 'OPEN' as OpportunityStatus,
        })
      }
    }

    // Positive wins from narrative
    if (winsNarrative && winsNarrative.trim().length > 20) {
      opportunities.push({
        title: 'Founder-Highlighted Win',
        description: winsNarrative.length > 200 ? `${winsNarrative.slice(0, 200)}…` : winsNarrative,
        category: 'OPERATIONAL',
        status: 'OPEN' as OpportunityStatus,
      })
    }

    return opportunities
  }

  private suggestActions(risks: RiskOut[]): ActionOut[] {
    return risks
      .filter((r) => r.severity === 'CRITICAL' || r.severity === 'HIGH')
      .map((r) => {
        let title = `Review and respond to: ${r.title}`
        let description: string | null = null
        let priority: Priority = 'HIGH'

        if (r.category === 'BURN' && r.severity === 'CRITICAL') {
          title = 'Schedule emergency board call re: runway'
          description = 'Runway is critical. Convene board to discuss bridge financing, expense reduction, or pivot options.'
          priority = 'HIGH'
        } else if (r.category === 'BURN') {
          title = 'Initiate fundraising conversation'
          description = 'Runway is tightening. Begin LP / investor outreach within 30 days.'
          priority = 'HIGH'
        } else if (r.category === 'REVENUE') {
          title = 'Schedule revenue review with founder'
          description = 'Understand root cause of declining growth. Identify whether churn, expansion, or new sales is the driver.'
          priority = 'MEDIUM'
        }

        return {
          title,
          description,
          priority: priority as Priority,
          status: 'PENDING' as ActionStatus,
        }
      })
  }

  private generateSummary(
    companyName: string,
    update: { period: string; fundraisingStatus: string },
    metrics: MetricSnapshot | null,
    risks: RiskOut[]
  ): string {
    const criticalRisks = risks.filter((r) => r.severity === 'CRITICAL').length
    const highRisks = risks.filter((r) => r.severity === 'HIGH').length

    if (criticalRisks > 0) {
      const mrrStr = metrics?.mrr ? `$${(metrics.mrr / 1000).toFixed(0)}K MRR` : 'current metrics'
      return `${companyName} requires immediate attention with ${criticalRisks} critical risk${criticalRisks > 1 ? 's' : ''} flagged in the ${update.period} update. With ${mrrStr}, the primary concern is ${risks.find((r) => r.severity === 'CRITICAL')?.title.toLowerCase() ?? 'financial sustainability'}. Immediate partner engagement recommended.`
    }

    if (highRisks > 0) {
      return `${companyName} shows signs of stress in the ${update.period} update with ${highRisks} high-severity risk${highRisks > 1 ? 's' : ''} detected. Close monitoring and proactive support from the portfolio team is warranted over the next 60 days.`
    }

    if (!metrics) {
      return `${companyName} submitted a ${update.period} update. Metrics are pending — review the narrative sections for qualitative context.`
    }

    const growthStr = metrics.revenueGrowthMom != null
      ? `growing at ${(metrics.revenueGrowthMom * 100).toFixed(1)}% MoM`
      : 'with stable performance'

    const runwayStr = metrics.runway != null
      ? ` and ${Math.floor(metrics.runway)} months of runway`
      : ''

    return `${companyName} is performing within healthy parameters${runwayStr}, ${growthStr}. The ${update.period} update shows ${update.fundraisingStatus === 'NOT_RAISING' ? 'no active fundraising' : `${update.fundraisingStatus.toLowerCase().replace(/_/g, ' ')}`}. No critical concerns flagged — standard monitoring cadence recommended.`
  }
}
