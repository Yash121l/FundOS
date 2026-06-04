import type { LPReportInput, LPReportOutput, CompanyWithMetrics } from '@fundos/types'

export class LPReportingAgent {
  async generate(input: LPReportInput): Promise<LPReportOutput> {
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
        {
          title: 'Executive Summary',
          content: this.executiveSummary(quarter, active, healthy, watchlist, atRisk, fundMetrics, tone),
          order: 1,
        },
        {
          title: 'Portfolio Highlights',
          content: this.portfolioHighlights(topPerformers, recentUpdates, tone),
          order: 2,
        },
        {
          title: 'Portfolio Risks',
          content: this.portfolioRisks(atRisk, watchlist, tone),
          order: 3,
        },
        {
          title: 'Fund Metrics',
          content: this.fundMetricsSection(fundMetrics, active, tone),
          order: 4,
        },
        {
          title: 'Company Appendix',
          content: this.companyAppendix(active),
          order: 5,
        },
      ],
    }
  }

  private executiveSummary(
    quarter: string,
    active: CompanyWithMetrics[],
    healthy: CompanyWithMetrics[],
    watchlist: CompanyWithMetrics[],
    atRisk: CompanyWithMetrics[],
    fm: LPReportInput['fundMetrics'],
    tone: string
  ): string {
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

  private portfolioHighlights(
    topPerformers: CompanyWithMetrics[],
    updates: LPReportInput['recentUpdates'],
    tone: string
  ): string {
    if (topPerformers.length === 0) {
      return `No portfolio highlights available for this period.`
    }

    const intro =
      tone === 'GROWTH_FOCUSED'
        ? `Several companies delivered exceptional results this quarter. The following highlights represent the strongest performers by revenue growth and momentum.`
        : `The following companies delivered strong performance this quarter.`

    const sections = topPerformers.map((c) => {
      const m = c.latestMetrics
      const mrrStr = m?.mrr ? this.fmt(m.mrr) : 'N/A'
      const growthStr = m?.revenueGrowthMom != null ? `${(m.revenueGrowthMom * 100).toFixed(1)}% MoM` : 'N/A'
      const runwayStr = m?.runway ? `${Math.round(m.runway)} months` : 'N/A'
      const update = updates.find((u) => u.companyId === c.id)
      const winQuote = update?.wins ? `\n\n> "${update.wins.slice(0, 150)}${update.wins.length > 150 ? '…' : ''}"` : ''

      return `### ${c.name}

- **MRR:** ${mrrStr} (${growthStr} growth)
- **Sector:** ${c.sector} · **Stage:** ${c.stage}
- **Runway:** ${runwayStr}${winQuote}`
    }).join('\n\n')

    return `${intro}\n\n${sections}`
  }

  private portfolioRisks(
    atRisk: CompanyWithMetrics[],
    watchlist: CompanyWithMetrics[],
    tone: string
  ): string {
    if (atRisk.length === 0 && watchlist.length === 0) {
      return `No companies are currently classified as At Risk or Watchlist. The portfolio is in a healthy position with no immediate concerns flagged.`
    }

    const parts: string[] = []

    if (atRisk.length > 0) {
      const intro = tone === 'CONSERVATIVE'
        ? `The following ${atRisk.length} compan${atRisk.length === 1 ? 'y requires' : 'ies require'} urgent attention from the portfolio team.`
        : `The following companies are classified as At Risk and require proactive support.`

      const items = atRisk.map((c) => {
        const m = c.latestMetrics
        const reasons: string[] = []
        if (m?.runway != null && m.runway < 6) reasons.push(`critical runway (${Math.floor(m.runway)} months)`)
        else if (m?.runway != null && m.runway < 12) reasons.push(`low runway (${Math.floor(m.runway)} months)`)
        if (m?.revenueGrowthMom != null && m.revenueGrowthMom < -0.05) reasons.push(`declining revenue (${(m.revenueGrowthMom * 100).toFixed(1)}% MoM)`)
        if (m?.burnRate != null && m?.mrr != null && m.mrr > 0 && m.burnRate / m.mrr > 3) reasons.push(`high burn multiple (${(m.burnRate / m.mrr).toFixed(1)}x)`)
        const reasonStr = reasons.length > 0 ? reasons.join(', ') : 'below health threshold on composite score'
        return `- **${c.name}** (${c.sector}, ${c.stage}) — ${reasonStr}. Health score: ${c.healthScore}/100.`
      }).join('\n')

      parts.push(`## At Risk Companies\n\n${intro}\n\n${items}`)
    }

    if (watchlist.length > 0) {
      const items = watchlist.map((c) => {
        const m = c.latestMetrics
        const mrrStr = m?.mrr ? this.fmt(m.mrr) : 'N/A'
        const growthStr = m?.revenueGrowthMom != null ? `${(m.revenueGrowthMom * 100).toFixed(1)}% MoM` : 'N/A'
        return `- **${c.name}** — MRR ${mrrStr}, growth ${growthStr}, health score ${c.healthScore}/100`
      }).join('\n')

      parts.push(`## Watchlist Companies\n\nThe following companies are flagged for closer monitoring. No immediate action required, but trajectory should be reviewed monthly.\n\n${items}`)
    }

    return parts.join('\n\n')
  }

  private fundMetricsSection(
    fm: LPReportInput['fundMetrics'],
    active: CompanyWithMetrics[],
    tone: string
  ): string {
    const burnMultiple = fm.totalMrr > 0 ? (fm.totalBurn / fm.totalMrr).toFixed(2) : 'N/A'
    const withMetrics = active.filter((c) => c.latestMetrics != null)
    const critical = withMetrics.filter((c) => (c.latestMetrics?.runway ?? 99) < 6).length
    const low = withMetrics.filter((c) => { const r = c.latestMetrics?.runway ?? 99; return r >= 6 && r < 12 }).length
    const healthyRunway = withMetrics.filter((c) => (c.latestMetrics?.runway ?? 0) >= 12).length

    const revenueNarrative = tone === 'GROWTH_FOCUSED'
      ? `Portfolio revenue grew to **${this.fmt(fm.totalMrr)} MRR** (${this.fmt(fm.totalArr)} ARR), reflecting sustained growth momentum across the portfolio.`
      : `Total portfolio MRR reached **${this.fmt(fm.totalMrr)}** (${this.fmt(fm.totalArr)} ARR) this quarter.`

    return `## Revenue

${revenueNarrative} Average month-over-month growth across reporting companies was **${(fm.avgGrowthMom * 100).toFixed(1)}%**.

## Burn & Efficiency

Total monthly burn across the portfolio is **${this.fmt(fm.totalBurn)}**, yielding a portfolio-level burn multiple of **${burnMultiple}x** (burn ÷ MRR). A burn multiple below 1.5x is considered efficient for growth-stage companies.

## Runway Distribution

| Runway | Companies |
|--------|-----------|
| < 6 months (Critical) | ${critical} |
| 6–12 months (Monitor) | ${low} |
| > 12 months (Healthy) | ${healthyRunway} |

Average portfolio runway: **${Math.round(fm.avgRunway)} months**.

## Headcount

Total portfolio headcount: **${fm.totalHeadcount.toLocaleString()} people** across ${withMetrics.length} reporting companies.`
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

    return `| Company | Sector | Stage | MRR | MoM Growth | Runway | Score |
|---------|--------|-------|-----|------------|--------|-------|
${rows}`
  }

  private fmt(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
    return `$${Math.round(value)}`
  }
}
