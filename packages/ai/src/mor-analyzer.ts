import { z } from 'zod'
import type { Severity } from '@fundos/types'
import { getOpenAIClient, MODEL_FAST } from './client'

const EscalationFlagSchema = z.object({
  type: z.string(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  title: z.string(),
  details: z.string(),
  escalateToIC: z.boolean(),
})

const MorAnalysisOutputSchema = z.object({
  summary: z.string(),
  overallHealth: z.enum(['HEALTHY', 'WATCH', 'AT_RISK', 'CRITICAL']),
  escalations: z.array(EscalationFlagSchema),
  founderTone: z.enum(['confident', 'cautious', 'distressed', 'uncertain']),
  keyInsights: z.array(z.string()),
})

export interface MorInput {
  companyId: string
  companyName: string
  sector: string
  period: string

  // P&L actuals
  revenueActual?: number | null
  ebitdaActual?: number | null
  burnRate?: number | null
  cashBalance?: number | null
  runway?: number | null

  // vs budget
  revenueVsBudgetPct?: number | null  // (actual - budget) / budget
  ebitdaVsBudgetPct?: number | null

  // Headcount
  headcount?: number | null
  attrition?: number | null

  // KPIs — actual vs target
  kpis?: Array<{ label: string; actual: number; target: number }>

  // Qualitative
  wins?: string | null
  misses?: string | null
  pivots?: string | null
  founderNotes?: string | null

  // Previous period data for trend detection
  prevPeriodRevenueMissPct?: number | null  // last month revenue vs budget
  prevPeriodBurnExcessPct?: number | null   // last month burn excess vs budget
  consecutiveRevenueMissMonths?: number
  consecutiveBurnExcessMonths?: number
}

export interface EscalationFlag {
  type: string
  severity: Severity
  title: string
  details: string
  escalateToIC: boolean
}

export interface MorAnalysisOutput {
  summary: string
  overallHealth: 'HEALTHY' | 'WATCH' | 'AT_RISK' | 'CRITICAL'
  escalations: EscalationFlag[]
  founderTone: 'confident' | 'cautious' | 'distressed' | 'uncertain'
  keyInsights: string[]
}

const SYSTEM_PROMPT = `You are a senior portfolio manager at a top-tier VC firm reviewing a Monthly Operations Report (MOR).
Analyze the data for threshold breaches, anomalies, and founder tone.
Be specific about which metrics triggered escalation and what actions are recommended.
Always respond with valid JSON. No markdown fences, no preamble.

Escalation rules:
- CRITICAL: runway < 6 months → emergency board session within 5 days; cash crisis
- CRITICAL: key co-founder departure or major team conflict → emergency board call within 48hrs
- CRITICAL: legal or regulatory action → legal counsel engaged same day
- HIGH: burn > 20% above plan for 2+ consecutive months → cost conservation plan within 7 days
- HIGH: revenue miss 2+ consecutive months (> 15% below budget) → GTM audit, IC flagged
- HIGH: down round signal from founder notes → bridge options evaluated
- MEDIUM: single customer > 35% of revenue → BD diversification push
- LOW: MOR submitted late → reminder sent, escalate if pattern repeats

Founder tone:
- confident: wins leading, metrics on/above target, assertive language
- cautious: acknowledges challenges, qualifying language, some concern
- distressed: urgent problems flagged, stress language, burn/churn focus, asks for help
- uncertain: vague, avoids committing to numbers, mixed signals`

export class MorAnalyzer {
  async analyze(input: MorInput): Promise<MorAnalysisOutput> {
    const client = getOpenAIClient()
    if (client) return this.analyzeWithAI(input, client)
    return this.analyzeRuleBased(input)
  }

  private async analyzeWithAI(
    input: MorInput,
    client: ReturnType<typeof getOpenAIClient> & {}
  ): Promise<MorAnalysisOutput> {
    const userMessage = buildPrompt(input)
    const startedAt = Date.now()

    console.log('[MorAnalyzer] analyzeWithAI start', {
      companyId: input.companyId,
      period: input.period,
      model: MODEL_FAST,
    })

    let response: Awaited<ReturnType<typeof client.chat.completions.create>>
    try {
      response = await client.chat.completions.create({
        model: MODEL_FAST,
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
      })
    } catch (err) {
      console.error('[MorAnalyzer] API call failed', { companyId: input.companyId, err })
      return this.analyzeRuleBased(input)
    }

    const durationMs = Date.now() - startedAt
    const text = response.choices[0]?.message?.content ?? '{}'

    console.log('[MorAnalyzer] analyzeWithAI complete', {
      companyId: input.companyId,
      period: input.period,
      durationMs,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
    })

    try {
      const parsed = JSON.parse(text)
      return MorAnalysisOutputSchema.parse(parsed)
    } catch (err) {
      console.error('[MorAnalyzer] schema validation failed, falling back to rule-based', { companyId: input.companyId, text, err })
      return this.analyzeRuleBased(input)
    }
  }

  analyzeRuleBased(input: MorInput): MorAnalysisOutput {
    const escalations: EscalationFlag[] = []
    const insights: string[] = []

    // ── Runway check ────────────────────────────────────────────
    if (input.runway != null) {
      if (input.runway < 3) {
        escalations.push({
          type: 'LOW_RUNWAY',
          severity: 'CRITICAL',
          title: `Critical runway — ${input.runway.toFixed(1)} months`,
          details: `Cash runway dropped to ${input.runway.toFixed(1)} months against $${fmtM(input.burnRate)} monthly burn. Emergency board session required within 5 days. Bridge financing or cost reduction plan must be activated immediately.`,
          escalateToIC: true,
        })
      } else if (input.runway < 6) {
        escalations.push({
          type: 'LOW_RUNWAY',
          severity: 'CRITICAL',
          title: `Runway below 6-month threshold — ${input.runway.toFixed(1)} months`,
          details: `Runway at ${input.runway.toFixed(1)} months triggers emergency protocol. Emergency board session within 5 days. Evaluate bridge vs. raise vs. strategic alternatives.`,
          escalateToIC: true,
        })
      } else if (input.runway < 9) {
        insights.push(`Runway at ${input.runway.toFixed(0)} months — monitoring runway trajectory ahead of fundraise.`)
      }
    }

    // ── Burn excess check ────────────────────────────────────────
    const consecBurnMonths = input.consecutiveBurnExcessMonths ?? 0
    if (input.burnRate != null && input.ebitdaVsBudgetPct != null) {
      const burnExcessPct = -input.ebitdaVsBudgetPct  // negative EBITDA vs budget = burn excess
      if (burnExcessPct > 0.20 && consecBurnMonths >= 2) {
        escalations.push({
          type: 'BURN_EXCESS',
          severity: 'HIGH',
          title: `Burn ${(burnExcessPct * 100).toFixed(0)}% above plan — 2nd consecutive month`,
          details: `Monthly burn exceeds plan by ${(burnExcessPct * 100).toFixed(0)}% for 2 consecutive months. Call within 24hrs. Cash conservation plan required within 7 days. Options: revenue acceleration, cost cuts, bridge round.`,
          escalateToIC: true,
        })
      } else if (burnExcessPct > 0.20) {
        escalations.push({
          type: 'BURN_EXCESS',
          severity: 'MEDIUM',
          title: `Burn ${(burnExcessPct * 100).toFixed(0)}% above plan`,
          details: `Monthly burn of $${fmtM(input.burnRate)} exceeds budget by ${(burnExcessPct * 100).toFixed(0)}%. Monitoring — second consecutive miss will trigger escalation protocol.`,
          escalateToIC: false,
        })
      }
    }

    // ── Revenue miss check ───────────────────────────────────────
    const consecRevenueMissMonths = input.consecutiveRevenueMissMonths ?? 0
    if (input.revenueVsBudgetPct != null) {
      const missPct = -input.revenueVsBudgetPct  // negative = below budget
      if (missPct > 0.15 && consecRevenueMissMonths >= 2) {
        escalations.push({
          type: 'REVENUE_MISS',
          severity: 'HIGH',
          title: `Revenue ${(missPct * 100).toFixed(0)}% below plan — 2nd consecutive month`,
          details: `Revenue missed plan by ${(missPct * 100).toFixed(0)}% for 2 consecutive months. Sales process deep-dive required. GTM audit triggered. IC flagged — 3-month miss would escalate to IC portfolio review.`,
          escalateToIC: true,
        })
      } else if (missPct > 0.15) {
        insights.push(`Revenue ${(missPct * 100).toFixed(0)}% below plan this month — watching for consecutive miss pattern.`)
      }
    }

    // ── Attrition check ──────────────────────────────────────────
    if (input.attrition != null && input.headcount != null && input.headcount > 0) {
      const attritionRate = input.attrition / input.headcount
      if (attritionRate >= 0.10) {
        escalations.push({
          type: 'TEAM_EVENT',
          severity: 'HIGH',
          title: `High attrition — ${input.attrition} departures (${(attritionRate * 100).toFixed(0)}% of team)`,
          details: `${input.attrition} team departures this month represents ${(attritionRate * 100).toFixed(0)}% monthly attrition. Succession planning and retention analysis required.`,
          escalateToIC: attritionRate >= 0.20,
        })
      }
    }

    // ── KPI miss check ───────────────────────────────────────────
    if (input.kpis && input.kpis.length > 0) {
      const missedKpis = input.kpis.filter(
        (k) => k.target > 0 && k.actual / k.target < 0.80
      )
      if (missedKpis.length >= 3) {
        insights.push(`${missedKpis.length} of ${input.kpis.length} core KPIs missed by >20%: ${missedKpis.map((k) => k.label).join(', ')}.`)
      }
    }

    // ── Positive signals ─────────────────────────────────────────
    if (input.revenueVsBudgetPct != null && input.revenueVsBudgetPct > 0.10) {
      insights.push(`Revenue ${(input.revenueVsBudgetPct * 100).toFixed(0)}% above plan — strong outperformance.`)
    }

    // ── Founder tone from qualitative ───────────────────────────
    const founderTone = detectTone(input)

    // ── Overall health ───────────────────────────────────────────
    const criticalCount = escalations.filter((e) => e.severity === 'CRITICAL').length
    const highCount = escalations.filter((e) => e.severity === 'HIGH').length
    let overallHealth: MorAnalysisOutput['overallHealth'] = 'HEALTHY'
    if (criticalCount > 0) overallHealth = 'CRITICAL'
    else if (highCount >= 2) overallHealth = 'AT_RISK'
    else if (highCount >= 1 || escalations.length >= 2) overallHealth = 'WATCH'

    // ── Summary ──────────────────────────────────────────────────
    const summary = buildSummary(input, escalations, overallHealth)

    return {
      summary,
      overallHealth,
      escalations,
      founderTone,
      keyInsights: insights,
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtM(n: number | null | undefined): string {
  if (n == null) return 'N/A'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(Math.round(n))
}

function detectTone(input: MorInput): MorAnalysisOutput['founderTone'] {
  const text = [input.wins, input.misses, input.pivots, input.founderNotes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const distressSignals = ['urgent', 'critical', 'crisis', 'desperate', 'failing', 'help', 'emergency', 'alarm']
  const cautionSignals = ['concerned', 'challenging', 'monitoring', 'watching', 'careful', 'expect', 'hope', 'uncertain']
  const confidentSignals = ['exceeded', 'ahead', 'strong', 'milestone', 'record', 'beat', 'outperformed']

  const distressScore = distressSignals.filter((s) => text.includes(s)).length
  const cautionScore = cautionSignals.filter((s) => text.includes(s)).length
  const confidentScore = confidentSignals.filter((s) => text.includes(s)).length

  // Also use financial signals
  const hasRevenueMiss = (input.revenueVsBudgetPct ?? 0) < -0.10
  const hasLowRunway = (input.runway ?? 99) < 9

  if (distressScore >= 2 || (hasRevenueMiss && hasLowRunway)) return 'distressed'
  if (confidentScore >= 2 && !hasRevenueMiss) return 'confident'
  if (cautionScore >= 2 || hasRevenueMiss || hasLowRunway) return 'cautious'
  return 'uncertain'
}

function buildSummary(
  input: MorInput,
  escalations: EscalationFlag[],
  health: MorAnalysisOutput['overallHealth']
): string {
  const parts: string[] = []

  if (health === 'CRITICAL') {
    parts.push(`⚠ CRITICAL — ${input.companyName} requires immediate attention.`)
  } else if (health === 'AT_RISK') {
    parts.push(`${input.companyName} is at risk — multiple threshold breaches detected.`)
  } else if (health === 'WATCH') {
    parts.push(`${input.companyName} is on watchlist — one or more metrics require monitoring.`)
  } else {
    parts.push(`${input.companyName} MOR for ${input.period} — metrics within acceptable range.`)
  }

  if (input.runway != null) {
    parts.push(`Runway: ${input.runway.toFixed(0)} months.`)
  }
  if (input.revenueVsBudgetPct != null) {
    const dir = input.revenueVsBudgetPct >= 0 ? 'ahead of' : 'below'
    parts.push(`Revenue ${Math.abs(input.revenueVsBudgetPct * 100).toFixed(0)}% ${dir} plan.`)
  }

  if (escalations.length > 0) {
    parts.push(`${escalations.length} escalation flag(s) raised.`)
  }

  return parts.join(' ')
}

function buildPrompt(input: MorInput): string {
  const kpiBlock = input.kpis && input.kpis.length > 0
    ? input.kpis.map((k) => `  ${k.label}: actual=${k.actual.toFixed(1)}, target=${k.target.toFixed(1)}`).join('\n')
    : '  No KPIs reported'

  return `Analyze the MOR for ${input.companyName} (${input.sector}) — Period: ${input.period}

FINANCIAL METRICS:
  Revenue vs Budget: ${input.revenueVsBudgetPct != null ? `${(input.revenueVsBudgetPct * 100).toFixed(1)}%` : 'N/A'}
  EBITDA vs Budget: ${input.ebitdaVsBudgetPct != null ? `${(input.ebitdaVsBudgetPct * 100).toFixed(1)}%` : 'N/A'}
  Monthly Burn: $${fmtM(input.burnRate)}
  Cash Runway: ${input.runway != null ? `${input.runway.toFixed(1)} months` : 'N/A'}
  Consecutive Revenue Miss Months: ${input.consecutiveRevenueMissMonths ?? 0}
  Consecutive Burn Excess Months: ${input.consecutiveBurnExcessMonths ?? 0}

TEAM:
  Headcount: ${input.headcount ?? 'N/A'}
  Attrition this month: ${input.attrition ?? 0}

KPIs:
${kpiBlock}

QUALITATIVE:
  Wins: ${input.wins ?? 'Not reported'}
  Misses: ${input.misses ?? 'Not reported'}
  Pivots: ${input.pivots ?? 'Not reported'}
  Founder Notes: ${input.founderNotes ?? 'Not reported'}

Respond with JSON matching this schema exactly:
{
  "summary": "string — 2-3 sentence executive summary",
  "overallHealth": "HEALTHY" | "WATCH" | "AT_RISK" | "CRITICAL",
  "escalations": [
    {
      "type": "BURN_EXCESS" | "REVENUE_MISS" | "LOW_RUNWAY" | "TEAM_EVENT" | "LEGAL" | "DOWN_ROUND" | "CUSTOMER_CONCENTRATION" | "LATE_SUBMISSION" | "OTHER",
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "title": "string — one-line flag title",
      "details": "string — 2-4 sentences with specific numbers and recommended action",
      "escalateToIC": boolean
    }
  ],
  "founderTone": "confident" | "cautious" | "distressed" | "uncertain",
  "keyInsights": ["string", ...]
}`
}
