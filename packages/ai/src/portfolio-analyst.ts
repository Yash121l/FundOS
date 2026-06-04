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
  FounderTone,
} from '@fundos/types'
import { getOpenAIClient, MODEL_FAST } from './client'

type RiskOut = PortfolioAnalystOutput['risks'][number]
type OpportunityOut = PortfolioAnalystOutput['opportunities'][number]
type ActionOut = PortfolioAnalystOutput['suggestedActions'][number]

const SYSTEM_PROMPT = `You are a senior portfolio analyst at a top-tier venture capital firm.
You analyze founder updates to assess company health, detect risks, and surface opportunities.
Be specific, data-driven, and actionable. Write for an experienced VC partner audience.
Always respond with valid JSON matching the schema provided — no markdown fences, no preamble.

Tone classification criteria:
- confident: Founder leads with wins, uses assertive language, metrics are on track, no hedging.
- cautious: Founder acknowledges challenges, uses qualifying language ("we expect", "we're monitoring"), some uncertainty present.
- distressed: Founder flags urgent problems, uses language suggesting stress (burn, churn, team issues), asks for help.
- uncertain: Founder is vague, avoids committing to metrics or direction, mixed signals throughout.`

export class PortfolioAnalyst {
  async analyze(input: PortfolioAnalystInput): Promise<PortfolioAnalystOutput> {
    const client = getOpenAIClient()
    if (client) return this.analyzeWithAI(input, client)
    return this.analyzeRuleBased(input)
  }

  // ── OpenAI path ──────────────────────────────────────────────

  private async analyzeWithAI(
    input: PortfolioAnalystInput,
    client: ReturnType<typeof getOpenAIClient> & {}
  ): Promise<PortfolioAnalystOutput> {
    const { company, latestUpdate, metricsHistory } = input
    const latest = metricsHistory[0] ?? null
    const prev = metricsHistory[1] ?? null

    const metricsBlock = latest
      ? `MRR: ${latest.mrr != null ? `$${(latest.mrr / 1000).toFixed(0)}K` : 'N/A'}
Monthly Burn: ${latest.burnRate != null ? `$${(latest.burnRate / 1000).toFixed(0)}K` : 'N/A'}
Runway: ${latest.runway != null ? `${Math.floor(latest.runway)} months` : 'N/A'}
MoM Revenue Growth: ${latest.revenueGrowthMom != null ? `${(latest.revenueGrowthMom * 100).toFixed(1)}%` : 'N/A'}
Headcount: ${latest.headcount ?? 'N/A'}
NRR: ${latest.nrr != null ? `${latest.nrr}%` : 'N/A'}${prev?.mrr && latest.mrr ? `\nPrevious Period MRR: $${(prev.mrr / 1000).toFixed(0)}K` : ''}`
      : 'No metrics reported this period.'

    const userMessage = `Analyze this founder update for ${company.name} (${company.sector}, ${company.stage}).

REPORTED METRICS (${latestUpdate.period}):
${metricsBlock}

FUNDRAISING: ${latestUpdate.fundraisingStatus.replace(/_/g, ' ')}${latestUpdate.fundraisingNote ? ` — ${latestUpdate.fundraisingNote}` : ''}

WINS:
${latestUpdate.wins}

RISKS & CONCERNS:
${latestUpdate.risks}
${latestUpdate.hiringNeeds ? `\nHIRING NEEDS:\n${latestUpdate.hiringNeeds}` : ''}
${latestUpdate.additionalNotes ? `\nADDITIONAL NOTES:\n${latestUpdate.additionalNotes}` : ''}

Respond with this JSON schema exactly:
{
  "founderTone": "confident" | "cautious" | "distressed" | "uncertain",
  "healthSummary": "2-3 sentence summary for a VC partner. Lead with the most important signal.",
  "risks": [{"title":"","description":"","severity":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL","category":"BURN"|"REVENUE"|"TEAM"|"PRODUCT"|"MARKET"|"FUNDRAISING"|"OPERATIONAL"|"LEGAL"|"OTHER","source":"ai","status":"OPEN"}],
  "opportunities": [{"title":"","description":"","category":"FUNDRAISING"|"GROWTH"|"REVENUE"|"OPERATIONAL"|"STRATEGIC","status":"OPEN"}],
  "suggestedActions": [{"title":"","description":"","priority":"LOW"|"MEDIUM"|"HIGH","status":"PENDING"}]
}`

    try {
      const response = await client.chat.completions.create({
        model: MODEL_FAST,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      })

      const raw = JSON.parse(response.choices[0]?.message?.content ?? '{}') as {
        founderTone?: string
        healthSummary?: string
        risks?: RiskOut[]
        opportunities?: OpportunityOut[]
        suggestedActions?: ActionOut[]
      }

      const validTones: FounderTone[] = ['confident', 'cautious', 'distressed', 'uncertain']
      const founderTone = validTones.includes(raw.founderTone as FounderTone)
        ? (raw.founderTone as FounderTone)
        : 'uncertain'

      return {
        founderTone,
        healthSummary: raw.healthSummary ?? this.generateSummaryFallback(company.name, latestUpdate, latest, []),
        risks: Array.isArray(raw.risks) ? raw.risks : [],
        opportunities: Array.isArray(raw.opportunities) ? raw.opportunities : [],
        suggestedActions: Array.isArray(raw.suggestedActions) ? raw.suggestedActions : [],
      }
    } catch {
      // OpenAI call failed — fall back to rule-based
      return this.analyzeRuleBased(input)
    }
  }

  // ── Rule-based fallback (original implementation) ────────────

  private async analyzeRuleBased(input: PortfolioAnalystInput): Promise<PortfolioAnalystOutput> {
    const { company, latestUpdate, metricsHistory } = input
    const latest = metricsHistory[0] ?? null

    const risks = this.detectRisks(latest, latestUpdate.risks)
    const opportunities = this.detectOpportunities(latest, latestUpdate.wins)
    const suggestedActions = this.suggestActions(risks)
    const healthSummary = this.generateSummaryFallback(company.name, latestUpdate, latest, risks)

    return { healthSummary, risks, opportunities, suggestedActions }
  }

  private detectRisks(metrics: MetricSnapshot | null, riskNarrative: string): RiskOut[] {
    const risks: RiskOut[] = []

    if (metrics) {
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

      if (metrics.burnRate != null && metrics.mrr != null && metrics.mrr > 0) {
        const ratio = metrics.burnRate / metrics.mrr
        if (ratio > 3) {
          risks.push({
            title: 'High Burn Multiple',
            description: `Burn-to-MRR ratio of ${ratio.toFixed(1)}x is above healthy threshold.`,
            severity: ratio > 5 ? ('HIGH' as Severity) : ('MEDIUM' as Severity),
            category: 'BURN' as RiskCategory,
            source: 'metrics',
            status: 'OPEN' as RiskStatus,
          })
        }
      }
    }

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
      if (metrics.revenueGrowthMom != null && metrics.revenueGrowthMom >= 0.15) {
        opportunities.push({
          title: 'Strong Growth Momentum — Fundraising Window',
          description: `${(metrics.revenueGrowthMom * 100).toFixed(1)}% MoM growth creates a compelling narrative for a growth round.`,
          category: 'FUNDRAISING',
          status: 'OPEN' as OpportunityStatus,
        })
      }

      if (metrics.runway != null && metrics.runway >= 18 && metrics.revenueGrowthMom != null && metrics.revenueGrowthMom > 0.05) {
        opportunities.push({
          title: 'Runway Strength Enables Aggressive Expansion',
          description: `With ${Math.floor(metrics.runway)} months of runway and positive growth, company is well-positioned to invest in expansion.`,
          category: 'GROWTH',
          status: 'OPEN' as OpportunityStatus,
        })
      }

      if (metrics.nrr != null && metrics.nrr > 110) {
        opportunities.push({
          title: 'Net Revenue Retention Indicates Expansion Potential',
          description: `NRR of ${metrics.nrr}% shows strong upsell/expansion dynamics worth leaning into.`,
          category: 'REVENUE',
          status: 'OPEN' as OpportunityStatus,
        })
      }
    }

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
          description = 'Understand root cause of declining growth.'
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

  private generateSummaryFallback(
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
      return `${companyName} shows signs of stress in the ${update.period} update with ${highRisks} high-severity risk${highRisks > 1 ? 's' : ''} detected. Close monitoring and proactive support from the portfolio team is warranted.`
    }

    if (!metrics) {
      return `${companyName} submitted a ${update.period} update. Metrics are pending — review the narrative sections for qualitative context.`
    }

    const growthStr = metrics.revenueGrowthMom != null
      ? `growing at ${(metrics.revenueGrowthMom * 100).toFixed(1)}% MoM`
      : 'with stable performance'

    const runwayStr = metrics.runway != null ? ` and ${Math.floor(metrics.runway)} months of runway` : ''

    return `${companyName} is performing within healthy parameters${runwayStr}, ${growthStr}. The ${update.period} update shows ${update.fundraisingStatus === 'NOT_RAISING' ? 'no active fundraising' : update.fundraisingStatus.toLowerCase().replace(/_/g, ' ')}. No critical concerns flagged.`
  }
}
