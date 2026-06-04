import type { LPReportInput, LPReportOutput, CompanyWithMetrics } from '@fundos/types'
import { getOpenAIClient, MODEL_SMART } from './client'

const SYSTEM_PROMPT = `You are an experienced LP report writer for a venture capital fund.
Write professional LP update content — clear, data-driven, and appropriate for institutional investors.
Respond with clean markdown text only: use ## for section headings, **bold** for key metrics, - for bullets, and pipe tables where needed.
Do not include a top-level # heading — the section title is added separately.
Be concise and precise. Write 200–400 words per section unless the data demands more.`

type Tone = 'STANDARD' | 'CONSERVATIVE' | 'GROWTH_FOCUSED'

function toneInstruction(tone: Tone): string {
  if (tone === 'GROWTH_FOCUSED') return 'Frame performance positively. Lead with momentum and growth signals. Maintain factual accuracy but emphasise what is working.'
  if (tone === 'CONSERVATIVE') return 'Be measured and precise. Lead with risk-adjusted observations. Do not overstate positive developments.'
  return 'Use a balanced, professional tone appropriate for a quarterly LP letter.'
}

export class LPReportingAgent {
  async generate(input: LPReportInput): Promise<LPReportOutput> {
    const client = getOpenAIClient()
    if (client) return this.generateWithAI(input, client)
    return this.generateRuleBased(input)
  }

  // ── OpenAI path ──────────────────────────────────────────────

  private async generateWithAI(
    input: LPReportInput,
    client: ReturnType<typeof getOpenAIClient> & {}
  ): Promise<LPReportOutput> {
    const { quarter, companies, recentUpdates, fundMetrics, tone = 'STANDARD' } = input

    const active = companies.filter((c) => c.status === 'ACTIVE')
    const healthy = active.filter((c) => c.healthStatus === 'HEALTHY')
    const watchlist = active.filter((c) => c.healthStatus === 'WATCHLIST')
    const atRisk = active.filter((c) => c.healthStatus === 'AT_RISK')
    const topPerformers = [...active]
      .filter((c) => c.latestMetrics?.mrr != null)
      .sort((a, b) => (b.latestMetrics?.revenueGrowthMom ?? 0) - (a.latestMetrics?.revenueGrowthMom ?? 0))
      .slice(0, 3)

    const fmt = (v: number) =>
      v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `$${Math.round(v / 1_000)}K` : `$${Math.round(v)}`

    const fundContext = `Quarter: ${quarter}
Total MRR: ${fmt(fundMetrics.totalMrr)} (ARR: ${fmt(fundMetrics.totalArr)})
Total Monthly Burn: ${fmt(fundMetrics.totalBurn)}
Avg MoM Growth: ${(fundMetrics.avgGrowthMom * 100).toFixed(1)}%
Avg Runway: ${Math.round(fundMetrics.avgRunway)} months
Total Headcount: ${fundMetrics.totalHeadcount}
Portfolio Health: ${healthy.length} Healthy / ${watchlist.length} Watchlist / ${atRisk.length} At Risk (${active.length} total active)`

    const companyRows = active.map((c) => {
      const m = c.latestMetrics
      return `${c.name} (${c.sector}, ${c.stage}) — MRR: ${m?.mrr ? fmt(m.mrr) : 'N/A'}, Growth: ${m?.revenueGrowthMom != null ? `${(m.revenueGrowthMom * 100).toFixed(1)}%` : 'N/A'}, Runway: ${m?.runway ? `${Math.floor(m.runway)}mo` : 'N/A'}, Health: ${c.healthStatus} (score: ${c.healthScore})`
    }).join('\n')

    const updateContext = recentUpdates.length > 0
      ? recentUpdates.slice(0, 8).map((u) => {
          const company = active.find((c) => c.id === u.companyId)
          return `${company?.name ?? 'Unknown'} (${u.period}): Wins — ${u.wins.slice(0, 150)}. Risks — ${u.risks.slice(0, 150)}.`
        }).join('\n')
      : 'No founder updates submitted this quarter.'

    const toneNote = toneInstruction(tone)

    const sectionPrompts: Array<{ title: string; order: number; prompt: string }> = [
      {
        title: 'Executive Summary',
        order: 1,
        prompt: `Write the Executive Summary section for a quarterly LP report.
Tone: ${toneNote}

Fund data:
${fundContext}

Cover: overall portfolio performance, key metrics, health distribution, and any headline risks or wins. Include a brief health distribution table.`,
      },
      {
        title: 'Portfolio Highlights',
        order: 2,
        prompt: `Write the Portfolio Highlights section.
Tone: ${toneNote}

Top performing companies this quarter:
${topPerformers.map((c) => {
  const m = c.latestMetrics
  const u = recentUpdates.find((u) => u.companyId === c.id)
  return `${c.name} (${c.sector}): MRR ${m?.mrr ? fmt(m.mrr) : 'N/A'}, Growth ${m?.revenueGrowthMom != null ? `${(m.revenueGrowthMom * 100).toFixed(1)}%` : 'N/A'}, Runway ${m?.runway ? `${Math.floor(m.runway)}mo` : 'N/A'}${u ? `\nFounder update excerpt: "${u.wins.slice(0, 200)}"` : ''}`
}).join('\n\n')}

Write a narrative for each company. Quote the founder where relevant.`,
      },
      {
        title: 'Portfolio Risks',
        order: 3,
        prompt: `Write the Portfolio Risks section.
Tone: ${toneNote}

At Risk companies:
${atRisk.length > 0 ? atRisk.map((c) => {
  const m = c.latestMetrics
  const u = recentUpdates.find((u) => u.companyId === c.id)
  return `${c.name}: health score ${c.healthScore}/100, runway ${m?.runway ? `${Math.floor(m.runway)}mo` : 'N/A'}, growth ${m?.revenueGrowthMom != null ? `${(m.revenueGrowthMom * 100).toFixed(1)}%` : 'N/A'}${u ? `, risks: "${u.risks.slice(0, 200)}"` : ''}`
}).join('\n') : 'None'}

Watchlist companies:
${watchlist.length > 0 ? watchlist.map((c) => `${c.name}: health score ${c.healthScore}/100`).join(', ') : 'None'}

Describe the risk landscape. Be specific about what each at-risk company needs.`,
      },
      {
        title: 'Fund Metrics',
        order: 4,
        prompt: `Write the Fund Metrics section.
Tone: ${toneNote}

${fundContext}

Cover: revenue growth, burn efficiency (burn multiple = ${fundMetrics.totalMrr > 0 ? (fundMetrics.totalBurn / fundMetrics.totalMrr).toFixed(2) : 'N/A'}x), runway distribution, headcount. Include a runway distribution table.`,
      },
      {
        title: 'Company Appendix',
        order: 5,
        prompt: `Write the Company Appendix section as a clean markdown table with all active portfolio companies.
Include columns: Company, Sector, Stage, MRR, MoM Growth, Runway, Health Score.
Use health emoji: 🟢 Healthy, 🟡 Watchlist, 🔴 At Risk.
Sort alphabetically.

Portfolio companies:
${companyRows}`,
      },
    ]

    try {
      const sectionResults = await Promise.all(
        sectionPrompts.map(async (s) => {
          const response = await client.chat.completions.create({
            model: MODEL_SMART,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: s.prompt },
            ],
            temperature: 0.5,
            max_tokens: 800,
          })
          return {
            title: s.title,
            content: response.choices[0]?.message?.content?.trim() ?? '',
            order: s.order,
          }
        })
      )

      // Ensure all sections have content; fall back to rule-based for any empty ones
      const ruleBased = await this.generateRuleBased(input)
      return {
        sections: sectionResults.map((s, i) =>
          s.content.length > 20 ? s : ruleBased.sections[i]!
        ),
      }
    } catch {
      return this.generateRuleBased(input)
    }
  }

  // ── Rule-based fallback (original implementation) ────────────

  private async generateRuleBased(input: LPReportInput): Promise<LPReportOutput> {
    const { quarter, companies, recentUpdates, fundMetrics, tone = 'STANDARD' } = input

    const active = companies.filter((c) => c.status === 'ACTIVE')
    const healthy = active.filter((c) => c.healthStatus === 'HEALTHY')
    const watchlist = active.filter((c) => c.healthStatus === 'WATCHLIST')
    const atRisk = active.filter((c) => c.healthStatus === 'AT_RISK')

    const topPerformers = [...active]
      .filter((c) => c.latestMetrics?.mrr != null)
      .sort((a, b) => (b.latestMetrics?.revenueGrowthMom ?? 0) - (a.latestMetrics?.revenueGrowthMom ?? 0))
      .slice(0, 3)

    return {
      sections: [
        { title: 'Executive Summary', content: this.executiveSummary(quarter, active, healthy, watchlist, atRisk, fundMetrics, tone), order: 1 },
        { title: 'Portfolio Highlights', content: this.portfolioHighlights(topPerformers, recentUpdates, tone), order: 2 },
        { title: 'Portfolio Risks', content: this.portfolioRisks(atRisk, watchlist, tone), order: 3 },
        { title: 'Fund Metrics', content: this.fundMetricsSection(fundMetrics, active, tone), order: 4 },
        { title: 'Company Appendix', content: this.companyAppendix(active), order: 5 },
      ],
    }
  }

  private executiveSummary(quarter: string, active: CompanyWithMetrics[], healthy: CompanyWithMetrics[], watchlist: CompanyWithMetrics[], atRisk: CompanyWithMetrics[], fm: LPReportInput['fundMetrics'], tone: string): string {
    const mrrStr = this.fmt(fm.totalMrr)
    const arrStr = this.fmt(fm.totalArr)
    const growthStr = `${(fm.avgGrowthMom * 100).toFixed(1)}%`
    const healthPct = active.length > 0 ? Math.round((healthy.length / active.length) * 100) : 0

    const opener =
      tone === 'GROWTH_FOCUSED'
        ? `${quarter} was a strong quarter for the portfolio, with continued growth momentum across the majority of companies.`
        : tone === 'CONSERVATIVE'
        ? `This report provides a measured overview of ${quarter} portfolio performance, with particular attention to risk and capital efficiency.`
        : `This report summarises portfolio performance for ${quarter} across ${active.length} active companies.`

    return `## Overview

${opener}

The portfolio generated **${mrrStr} in total MRR** (${arrStr} ARR) with an average month-over-month revenue growth of **${growthStr}** across reporting companies. Total monthly burn stood at ${this.fmt(fm.totalBurn)}, with an average portfolio runway of **${Math.round(fm.avgRunway)} months**.

## Health Distribution

${healthPct}% of the portfolio (${healthy.length} of ${active.length} companies) is classified as **Healthy** this quarter.

| Status | Count | Share |
|--------|-------|-------|
| Healthy | ${healthy.length} | ${active.length > 0 ? Math.round((healthy.length / active.length) * 100) : 0}% |
| Watchlist | ${watchlist.length} | ${active.length > 0 ? Math.round((watchlist.length / active.length) * 100) : 0}% |
| At Risk | ${atRisk.length} | ${active.length > 0 ? Math.round((atRisk.length / active.length) * 100) : 0}% |

${atRisk.length > 0
  ? `**${atRisk.length} compan${atRisk.length === 1 ? 'y requires' : 'ies require'} immediate attention** this quarter. Details are covered in the Portfolio Risks section.`
  : `No companies are classified as At Risk this quarter — a positive signal across the portfolio.`}`
  }

  private portfolioHighlights(topPerformers: CompanyWithMetrics[], updates: LPReportInput['recentUpdates'], tone: string): string {
    if (topPerformers.length === 0) return `No portfolio highlights available for this period.`

    const intro = tone === 'GROWTH_FOCUSED'
      ? `Several companies delivered exceptional results this quarter.`
      : `The following companies delivered strong performance this quarter.`

    const sections = topPerformers.map((c) => {
      const m = c.latestMetrics
      const mrrStr = m?.mrr ? this.fmt(m.mrr) : 'N/A'
      const growthStr = m?.revenueGrowthMom != null ? `${(m.revenueGrowthMom * 100).toFixed(1)}% MoM` : 'N/A'
      const runwayStr = m?.runway ? `${Math.round(m.runway)} months` : 'N/A'
      const update = updates.find((u) => u.companyId === c.id)
      const winQuote = update?.wins ? `\n\n> "${update.wins.slice(0, 150)}${update.wins.length > 150 ? '…' : ''}"` : ''
      return `### ${c.name}\n\n- **MRR:** ${mrrStr} (${growthStr} growth)\n- **Sector:** ${c.sector} · **Stage:** ${c.stage}\n- **Runway:** ${runwayStr}${winQuote}`
    }).join('\n\n')

    return `${intro}\n\n${sections}`
  }

  private portfolioRisks(atRisk: CompanyWithMetrics[], watchlist: CompanyWithMetrics[], tone: string): string {
    if (atRisk.length === 0 && watchlist.length === 0) return `No companies are currently classified as At Risk or Watchlist. The portfolio is in a healthy position.`

    const parts: string[] = []

    if (atRisk.length > 0) {
      const intro = tone === 'CONSERVATIVE'
        ? `The following ${atRisk.length} compan${atRisk.length === 1 ? 'y requires' : 'ies require'} urgent attention.`
        : `The following companies are classified as At Risk and require proactive support.`

      const items = atRisk.map((c) => {
        const m = c.latestMetrics
        const reasons: string[] = []
        if (m?.runway != null && m.runway < 6) reasons.push(`critical runway (${Math.floor(m.runway)} months)`)
        else if (m?.runway != null && m.runway < 12) reasons.push(`low runway (${Math.floor(m.runway)} months)`)
        if (m?.revenueGrowthMom != null && m.revenueGrowthMom < -0.05) reasons.push(`declining revenue (${(m.revenueGrowthMom * 100).toFixed(1)}% MoM)`)
        if (m?.burnRate != null && m?.mrr != null && m.mrr > 0 && m.burnRate / m.mrr > 3) reasons.push(`high burn multiple (${(m.burnRate / m.mrr).toFixed(1)}x)`)
        return `- **${c.name}** (${c.sector}, ${c.stage}) — ${reasons.join(', ') || 'below health threshold'}. Health score: ${c.healthScore}/100.`
      }).join('\n')

      parts.push(`## At Risk Companies\n\n${intro}\n\n${items}`)
    }

    if (watchlist.length > 0) {
      const items = watchlist.map((c) => {
        const m = c.latestMetrics
        return `- **${c.name}** — MRR ${m?.mrr ? this.fmt(m.mrr) : 'N/A'}, growth ${m?.revenueGrowthMom != null ? `${(m.revenueGrowthMom * 100).toFixed(1)}%` : 'N/A'}, health score ${c.healthScore}/100`
      }).join('\n')
      parts.push(`## Watchlist Companies\n\nThe following companies are flagged for closer monitoring.\n\n${items}`)
    }

    return parts.join('\n\n')
  }

  private fundMetricsSection(fm: LPReportInput['fundMetrics'], active: CompanyWithMetrics[], tone: string): string {
    const burnMultiple = fm.totalMrr > 0 ? (fm.totalBurn / fm.totalMrr).toFixed(2) : 'N/A'
    const withMetrics = active.filter((c) => c.latestMetrics != null)
    const critical = withMetrics.filter((c) => (c.latestMetrics?.runway ?? 99) < 6).length
    const low = withMetrics.filter((c) => { const r = c.latestMetrics?.runway ?? 99; return r >= 6 && r < 12 }).length
    const healthyRunway = withMetrics.filter((c) => (c.latestMetrics?.runway ?? 0) >= 12).length

    const revenueNarrative = tone === 'GROWTH_FOCUSED'
      ? `Portfolio revenue grew to **${this.fmt(fm.totalMrr)} MRR** (${this.fmt(fm.totalArr)} ARR), reflecting sustained growth momentum.`
      : `Total portfolio MRR reached **${this.fmt(fm.totalMrr)}** (${this.fmt(fm.totalArr)} ARR) this quarter.`

    return `## Revenue\n\n${revenueNarrative} Average month-over-month growth across reporting companies was **${(fm.avgGrowthMom * 100).toFixed(1)}%**.\n\n## Burn & Efficiency\n\nTotal monthly burn across the portfolio is **${this.fmt(fm.totalBurn)}**, yielding a portfolio-level burn multiple of **${burnMultiple}x** (burn ÷ MRR).\n\n## Runway Distribution\n\n| Runway | Companies |\n|--------|-----------|\n| < 6 months (Critical) | ${critical} |\n| 6–12 months (Monitor) | ${low} |\n| > 12 months (Healthy) | ${healthyRunway} |\n\nAverage portfolio runway: **${Math.round(fm.avgRunway)} months**.\n\n## Headcount\n\nTotal portfolio headcount: **${fm.totalHeadcount.toLocaleString()} people** across ${withMetrics.length} reporting companies.`
  }

  private companyAppendix(active: CompanyWithMetrics[]): string {
    const sorted = [...active].sort((a, b) => a.name.localeCompare(b.name))
    const rows = sorted.map((c) => {
      const m = c.latestMetrics
      const mrr = m?.mrr ? this.fmt(m.mrr) : '—'
      const growth = m?.revenueGrowthMom != null ? `${(m.revenueGrowthMom * 100).toFixed(1)}%` : '—'
      const runway = m?.runway ? `${Math.floor(m.runway)}mo` : '—'
      const status = c.healthStatus === 'HEALTHY' ? '🟢' : c.healthStatus === 'WATCHLIST' ? '🟡' : '🔴'
      return `| ${status} ${c.name} | ${c.sector} | ${c.stage} | ${mrr} | ${growth} | ${runway} | ${c.healthScore} |`
    }).join('\n')

    return `| Company | Sector | Stage | MRR | MoM Growth | Runway | Score |\n|---------|--------|-------|-----|------------|--------|-------|\n${rows}`
  }

  private fmt(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
    return `$${Math.round(value)}`
  }
}
