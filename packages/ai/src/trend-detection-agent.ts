import type { TrendDetectionInput, TrendDetectionOutput, TrendCategory, Severity } from '@fundos/types'
import { getOpenAIClient, MODEL_FAST } from './client'

type Finding = TrendDetectionOutput['findings'][number]
type Evidence = Finding['evidence'][number]

const MIN_EVIDENCE = 3

// Keyword clusters for narrative pattern matching.
// Each cluster has a label and a set of terms — if 3+ companies
// mention terms from the same cluster, it becomes a trend.
const RISK_KEYWORD_CLUSTERS: Array<{ label: string; terms: string[] }> = [
  {
    label: 'Sales cycle length',
    terms: ['sales cycle', 'deal cycle', 'long cycle', 'slow sales', 'pipeline slow'],
  },
  {
    label: 'Customer churn',
    terms: ['churn', 'attrition', 'losing customers', 'customer loss', 'retention'],
  },
  {
    label: 'Hiring difficulties',
    terms: ['hard to hire', 'talent shortage', 'hiring slow', 'pipeline thin', 'recruiting'],
  },
  {
    label: 'Regulatory pressure',
    terms: ['regulation', 'compliance', 'gdpr', 'regulatory', 'legal challenge'],
  },
  {
    label: 'AI competition',
    terms: ['ai competition', 'ai competitor', 'openai', 'llm competition', 'commoditisation'],
  },
  {
    label: 'Market slowdown',
    terms: ['market slow', 'demand drop', 'macro headwind', 'budget freeze', 'spending cut'],
  },
]

export class TrendDetectionAgent {
  async detect(input: TrendDetectionInput): Promise<TrendDetectionOutput> {
    const { updates } = input

    if (updates.length < MIN_EVIDENCE) return { findings: [] }

    const findings: Finding[] = []

    const burnFinding = this.detectBurnRisk(updates)
    if (burnFinding) findings.push(burnFinding)

    const fundraisingFinding = this.detectFundraisingWave(updates)
    if (fundraisingFinding) findings.push(fundraisingFinding)

    const hiringFinding = this.detectHiringPattern(updates)
    if (hiringFinding) findings.push(hiringFinding)

    const keywordFindings = this.detectKeywordClusters(updates)
    findings.push(...keywordFindings)

    const growthFinding = this.detectGrowthPattern(updates)
    if (growthFinding) findings.push(growthFinding)

    // Enhance with AI narratives if OpenAI is available
    const client = getOpenAIClient()
    if (client && findings.length > 0) {
      return { findings: await this.enhanceWithAI(findings, client) }
    }

    return { findings }
  }

  private async enhanceWithAI(
    findings: Finding[],
    client: ReturnType<typeof getOpenAIClient> & {}
  ): Promise<Finding[]> {
    return Promise.all(
      findings.map(async (finding) => {
        const evidenceText = finding.evidence
          .slice(0, 5)
          .map((e) => `- ${e.quote}`)
          .join('\n')

        try {
          const response = await client.chat.completions.create({
            model: MODEL_FAST,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: 'You are a VC portfolio analyst. Respond only with valid JSON.',
              },
              {
                role: 'user',
                content: `A portfolio trend has been detected across ${finding.evidence.length} companies.

Trend: ${finding.title}
Category: ${finding.category}
Severity: ${finding.severity}

Evidence quotes:
${evidenceText}

Write:
{
  "summary": "3 sentences for a VC partner. Be specific about the pattern and its implication.",
  "recommendedAction": "One concrete action the fund team should take (1 sentence).",
  "confidenceScore": 0.0-1.0
}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 300,
          })

          const raw = JSON.parse(response.choices[0]?.message?.content ?? '{}') as {
            summary?: string
            recommendedAction?: string
            confidenceScore?: number
          }

          return {
            ...finding,
            summary: raw.summary ?? finding.summary,
            recommendedAction: raw.recommendedAction,
            confidenceScore: typeof raw.confidenceScore === 'number'
              ? Math.min(1, Math.max(0, raw.confidenceScore))
              : undefined,
          }
        } catch {
          return finding
        }
      })
    )
  }

  private detectBurnRisk(updates: TrendDetectionInput['updates']): Finding | null {
    const atRisk = updates.filter((u) => u.runway != null && u.runway < 12)
    if (atRisk.length < MIN_EVIDENCE) return null

    const critical = atRisk.filter((u) => u.runway! < 6)
    const severity: Severity = critical.length >= 2 ? 'HIGH' : 'MEDIUM'

    const evidence: Evidence[] = atRisk.map((u) => ({
      companyId: u.companyId,
      updateId: u.id,
      quote: `${u.company.name} reported ${Math.floor(u.runway!)} months of runway in the ${u.period} update.`,
    }))

    const avgRunway = Math.round(atRisk.reduce((s, u) => s + u.runway!, 0) / atRisk.length)

    return {
      title: `${atRisk.length} Portfolio Companies Below 12-Month Runway`,
      summary: `${atRisk.length} active companies are reporting runway below 12 months, with an average of ${avgRunway} months. ${critical.length > 0 ? `${critical.length} ${critical.length === 1 ? 'company is' : 'companies are'} in critical territory under 6 months.` : 'Proactive outreach and fundraising support is recommended across this cohort.'}`,
      category: 'SHARED_RISK' as TrendCategory,
      severity,
      evidence,
    }
  }

  private detectFundraisingWave(updates: TrendDetectionInput['updates']): Finding | null {
    const raising = updates.filter((u) =>
      ['ACTIVELY_RAISING', 'TERM_SHEET', 'EXPLORING'].includes(u.fundraisingStatus)
    )
    if (raising.length < MIN_EVIDENCE) return null

    const activeCount = raising.filter((u) =>
      ['ACTIVELY_RAISING', 'TERM_SHEET'].includes(u.fundraisingStatus)
    ).length

    const evidence: Evidence[] = raising.map((u) => ({
      companyId: u.companyId,
      updateId: u.id,
      quote: `${u.company.name} is ${u.fundraisingStatus.toLowerCase().replace(/_/g, ' ')} as of ${u.period}.${u.fundraisingNote ? ` Note: ${u.fundraisingNote.slice(0, 80)}` : ''}`,
    }))

    return {
      title: `Fundraising Wave — ${raising.length} Companies in Market`,
      summary: `${raising.length} portfolio companies are currently fundraising, with ${activeCount} actively in market. This creates both LP narrative opportunities and potential competition for investor attention across the portfolio.`,
      category: 'FUNDRAISING' as TrendCategory,
      severity: activeCount >= 4 ? 'HIGH' as Severity : 'MEDIUM' as Severity,
      evidence,
    }
  }

  private detectHiringPattern(updates: TrendDetectionInput['updates']): Finding | null {
    const hiring = updates.filter(
      (u) => u.hiringNeeds && u.hiringNeeds.trim().length > 10
    )
    if (hiring.length < MIN_EVIDENCE) return null

    const evidence: Evidence[] = hiring.map((u) => ({
      companyId: u.companyId,
      updateId: u.id,
      quote: `${u.company.name}: "${u.hiringNeeds!.slice(0, 100)}${u.hiringNeeds!.length > 100 ? '…' : ''}"`,
    }))

    return {
      title: `${hiring.length} Companies Actively Hiring`,
      summary: `${hiring.length} portfolio companies have open hiring needs this period. Consider coordinating talent-sharing programs, referral networks, or pooled recruiter resources across the portfolio.`,
      category: 'HIRING_PATTERN' as TrendCategory,
      severity: 'LOW' as Severity,
      evidence,
    }
  }

  private detectKeywordClusters(updates: TrendDetectionInput['updates']): Finding[] {
    const findings: Finding[] = []

    for (const cluster of RISK_KEYWORD_CLUSTERS) {
      const matches = updates.filter((u) => {
        const text = `${u.risks} ${u.wins} ${u.additionalNotes ?? ''}`.toLowerCase()
        return cluster.terms.some((term) => text.includes(term))
      })

      if (matches.length < MIN_EVIDENCE) continue

      const evidence: Evidence[] = matches.map((u) => {
        const text = `${u.risks} ${u.additionalNotes ?? ''}`.toLowerCase()
        const matchedTerm = cluster.terms.find((t) => text.includes(t)) ?? cluster.terms[0]!
        const sentence = this.extractSentence(u.risks, matchedTerm)
        return {
          companyId: u.companyId,
          updateId: u.id,
          quote: `${u.company.name}: "${sentence}"`,
        }
      })

      findings.push({
        title: `Shared Operational Theme: ${cluster.label} (${matches.length} companies)`,
        summary: `${matches.length} portfolio companies flagged "${cluster.label.toLowerCase()}" as a concern in their latest updates. This cross-portfolio signal warrants a coordinated response or portfolio-wide resource.`,
        category: 'OPERATIONAL' as TrendCategory,
        severity: 'MEDIUM' as Severity,
        evidence,
      })
    }

    return findings
  }

  private detectGrowthPattern(updates: TrendDetectionInput['updates']): Finding | null {
    const declining = updates.filter((u) => u.mrr != null && u.mrr < 50_000)
    if (declining.length < MIN_EVIDENCE) return null

    const evidence: Evidence[] = declining.map((u) => ({
      companyId: u.companyId,
      updateId: u.id,
      quote: `${u.company.name} reported $${((u.mrr ?? 0) / 1000).toFixed(0)}K MRR in ${u.period}.`,
    }))

    return {
      title: `${declining.length} Early-Stage Companies Need Revenue Support`,
      summary: `${declining.length} portfolio companies are in the sub-$50K MRR range, indicating they are still in early revenue development. Consider targeted go-to-market support, customer introductions, or founder peer groups.`,
      category: 'GROWTH_PATTERN' as TrendCategory,
      severity: 'LOW' as Severity,
      evidence,
    }
  }

  private extractSentence(text: string, keyword: string): string {
    const lower = text.toLowerCase()
    const idx = lower.indexOf(keyword)
    if (idx === -1) return text.slice(0, 100)
    const start = Math.max(0, text.lastIndexOf('.', idx) + 1)
    const end = text.indexOf('.', idx)
    const sentence = text.slice(start, end === -1 ? Math.min(text.length, idx + 120) : end + 1).trim()
    return sentence.length > 120 ? `${sentence.slice(0, 120)}…` : sentence
  }
}
