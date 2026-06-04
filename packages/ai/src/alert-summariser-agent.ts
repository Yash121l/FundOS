import type { AlertDigestInput, AlertDigest, AlertDigestGroup } from '@fundos/types'
import { getOpenAIClient, MODEL_FAST } from './client'

const CATEGORY_LABELS: Record<string, string> = {
  BURN: 'Burn & Runway',
  REVENUE: 'Revenue',
  TEAM: 'Team & Hiring',
  PRODUCT: 'Product',
  MARKET: 'Market',
  FUNDRAISING: 'Fundraising',
  OPERATIONAL: 'Operational',
  LEGAL: 'Legal & Compliance',
  OTHER: 'Other',
}

const COORDINATED_ACTIONS: Record<string, string> = {
  BURN: 'Schedule a joint review of cash positions and connect affected founders with bridge financing contacts.',
  REVENUE: 'Arrange a revenue strategy session — consider facilitating customer introductions across the portfolio.',
  TEAM: 'Circulate open roles across the portfolio network; explore shared recruiter arrangements.',
  MARKET: 'Prepare a market update memo and distribute to affected founders.',
  FUNDRAISING: 'Coordinate LP intro sessions and ensure deal memos are current for fundraising companies.',
  OPERATIONAL: 'Connect founders facing similar operational challenges for peer knowledge-sharing.',
  LEGAL: 'Brief your legal counsel and ensure affected companies have adequate guidance.',
  PRODUCT: 'Facilitate product roundtable for companies facing similar challenges.',
  OTHER: 'Assess individually and prioritise based on severity.',
}

function groupSeverity(risks: AlertDigestInput['risks']): AlertDigestGroup['severity'] {
  if (risks.some((r) => r.severity === 'CRITICAL')) return 'critical'
  return 'high'
}

export class AlertSummariserAgent {
  async summarise(input: AlertDigestInput): Promise<AlertDigest> {
    if (input.risks.length === 0) {
      return {
        weekOf: input.weekOf,
        totalAlerts: 0,
        groups: [],
        overallSummary: 'No high-severity alerts were raised this week.',
        generatedAt: new Date(),
      }
    }

    const client = getOpenAIClient()
    if (client) return this.summariseWithAI(input, client)
    return this.summariseRuleBased(input)
  }

  private async summariseWithAI(
    input: AlertDigestInput,
    client: NonNullable<ReturnType<typeof getOpenAIClient>>
  ): Promise<AlertDigest> {
    const grouped = this.groupByCategory(input.risks)
    const groupEntries = Object.entries(grouped)

    try {
      const enhancedGroups = await Promise.all(
        groupEntries.map(async ([category, risks]) => {
          const companies = [...new Set(risks.map((r) => r.companyName))]
          const riskList = risks.map((r) => `- [${r.companyName}] ${r.severity}: ${r.title}`).join('\n')
          const severity = groupSeverity(risks)

          const startTime = Date.now()
          const response = await client.chat.completions.create({
            model: MODEL_FAST,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'You are a VC portfolio analyst writing a weekly alert digest. Respond with JSON.' },
              {
                role: 'user',
                content: `${companies.length} portfolio companies have ${CATEGORY_LABELS[category] ?? category} alerts this week:\n\n${riskList}\n\nWrite:\n{\n  "narrative": "2-sentence summary of what this risk cluster means for the portfolio",\n  "coordinatedAction": "One concrete action the fund team should take (1 sentence)"\n}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 250,
          })
          console.info('[AI] alert-summariser group enhancement', {
            model: MODEL_FAST,
            category,
            riskCount: risks.length,
            companyCount: companies.length,
            durationMs: Date.now() - startTime,
            tokens: response.usage,
            prompt: riskList.slice(0, 300),
            output: response.choices[0]?.message?.content?.slice(0, 200),
          })

          const raw = JSON.parse(response.choices[0]?.message?.content ?? '{}') as {
            narrative?: string
            coordinatedAction?: string
          }

          return {
            category: CATEGORY_LABELS[category] ?? category,
            severity,
            count: risks.length,
            companies,
            narrative: raw.narrative ?? this.buildNarrative(category, risks, companies),
            coordinatedAction: raw.coordinatedAction ?? COORDINATED_ACTIONS[category] ?? COORDINATED_ACTIONS.OTHER!,
          } satisfies AlertDigestGroup
        })
      )

      const criticalCount = input.risks.filter((r) => r.severity === 'CRITICAL').length
      const highCount = input.risks.filter((r) => r.severity === 'HIGH').length
      const companyCount = new Set(input.risks.map((r) => r.companyName)).size

      const summaryStartTime = Date.now()
      const summaryResponse = await client.chat.completions.create({
        model: MODEL_FAST,
        messages: [
          { role: 'system', content: 'You are a VC portfolio analyst. Write a 2-sentence executive summary.' },
          {
            role: 'user',
            content: `Week of ${input.weekOf}: ${input.risks.length} high-severity alerts across ${companyCount} companies (${criticalCount} critical, ${highCount} high). Categories: ${enhancedGroups.map((g) => `${g.category} (${g.count})`).join(', ')}. Write a 2-sentence executive summary for a partner.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      })
      console.info('[AI] alert-summariser overall summary', {
        model: MODEL_FAST,
        weekOf: input.weekOf,
        totalRisks: input.risks.length,
        companyCount,
        criticalCount,
        highCount,
        categories: enhancedGroups.map((g) => `${g.category} (${g.count})`).join(', '),
        durationMs: Date.now() - summaryStartTime,
        tokens: summaryResponse.usage,
        output: summaryResponse.choices[0]?.message?.content?.trim()?.slice(0, 300),
      })

      return {
        weekOf: input.weekOf,
        totalAlerts: input.risks.length,
        groups: enhancedGroups,
        overallSummary: summaryResponse.choices[0]?.message?.content?.trim() ?? this.buildOverallSummary(input),
        generatedAt: new Date(),
      }
    } catch (err) {
      console.error('[AI] alert-summariser AI summarisation failed, falling back to rule-based', {
        weekOf: input.weekOf,
        riskCount: input.risks.length,
        error: err instanceof Error ? err.message : String(err),
      })
      return this.summariseRuleBased(input)
    }
  }

  private summariseRuleBased(input: AlertDigestInput): AlertDigest {
    const grouped = this.groupByCategory(input.risks)
    const groups: AlertDigestGroup[] = Object.entries(grouped).map(([category, risks]) => {
      const companies = [...new Set(risks.map((r) => r.companyName))]
      return {
        category: CATEGORY_LABELS[category] ?? category,
        severity: groupSeverity(risks),
        count: risks.length,
        companies,
        narrative: this.buildNarrative(category, risks, companies),
        coordinatedAction: COORDINATED_ACTIONS[category] ?? COORDINATED_ACTIONS.OTHER!,
      }
    })

    return {
      weekOf: input.weekOf,
      totalAlerts: input.risks.length,
      groups,
      overallSummary: this.buildOverallSummary(input),
      generatedAt: new Date(),
    }
  }

  private groupByCategory(risks: AlertDigestInput['risks']): Record<string, AlertDigestInput['risks']> {
    const groups: Record<string, AlertDigestInput['risks']> = {}
    for (const risk of risks) {
      const cat = risk.category
      if (!groups[cat]) groups[cat] = []
      groups[cat]!.push(risk)
    }
    return Object.fromEntries(
      Object.entries(groups).sort(([, a], [, b]) => {
        const critA = a.filter((r) => r.severity === 'CRITICAL').length
        const critB = b.filter((r) => r.severity === 'CRITICAL').length
        return critB - critA || b.length - a.length
      })
    )
  }

  private buildNarrative(category: string, risks: AlertDigestInput['risks'], companies: string[]): string {
    const critCount = risks.filter((r) => r.severity === 'CRITICAL').length
    const label = CATEGORY_LABELS[category] ?? category.toLowerCase()
    const companyList = companies.length <= 3 ? companies.join(', ') : `${companies.slice(0, 2).join(', ')} and ${companies.length - 2} others`

    if (critCount > 0) {
      return `${critCount} critical ${label.toLowerCase()} issue${critCount > 1 ? 's' : ''} flagged across ${companyList}. Immediate partner attention required.`
    }
    return `${risks.length} ${label.toLowerCase()} alert${risks.length > 1 ? 's' : ''} raised across ${companyList}. Monitor closely and review with founders in the next check-in.`
  }

  private buildOverallSummary(input: AlertDigestInput): string {
    const criticalCount = input.risks.filter((r) => r.severity === 'CRITICAL').length
    const companyCount = new Set(input.risks.map((r) => r.companyName)).size

    if (criticalCount > 0) {
      return `This week saw ${input.risks.length} high-severity alerts across ${companyCount} companies, including ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} requiring immediate partner engagement. Review priority items below and schedule follow-up calls.`
    }
    return `${input.risks.length} high-severity alerts were raised across ${companyCount} portfolio companies this week. No critical issues flagged — monitor watchlist companies and follow up on pending actions.`
  }
}
