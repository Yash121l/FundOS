import type { AskContext } from '@fundos/types'
import { getOpenAIClient, MODEL_SMART } from './client'
import type OpenAI from 'openai'

const SYSTEM_PROMPT = `You are the portfolio intelligence AI for SignalOS, a venture capital operating platform.
You have access to live portfolio data and answer questions from VC partners with precision.
Rules:
- Be specific: cite company names, exact metrics, and periods.
- Format clearly: use markdown headers, bullets, and tables where appropriate.
- Cite sources inline using [Company Name] notation.
- If data is missing or insufficient to answer, say so explicitly.
- Do not hallucinate metrics. Only use the portfolio data provided.
- Keep responses concise but complete.`

// Configurable truncation lengths (chars) — adjust if token budget allows
const UPDATE_WINS_TRUNCATE = 100
const UPDATE_RISKS_TRUNCATE = 100
const TREND_SUMMARY_TRUNCATE = 120
const MAX_COMPANIES_IN_PROMPT = 30

export class PortfolioQAAgent {
  async stream(question: string, context: AskContext): Promise<ReadableStream<Uint8Array>> {
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      throw new TypeError('[PortfolioQA] question must be a non-empty string')
    }
    if (
      !context ||
      !Array.isArray(context.companies) ||
      !Array.isArray(context.recentUpdates) ||
      !Array.isArray(context.activeTrends) ||
      !Array.isArray(context.activeRisks) ||
      !context.fundMetrics
    ) {
      throw new TypeError('[PortfolioQA] context is missing required properties')
    }

    const client = getOpenAIClient()
    if (client) return this.streamWithAI(question.trim(), context, client)
    return this.streamFallback(question.trim(), context)
  }

  private async streamWithAI(
    question: string,
    context: AskContext,
    client: NonNullable<ReturnType<typeof getOpenAIClient>>
  ): Promise<ReadableStream<Uint8Array>> {
    const messages = this.buildMessages(question, context)
    const startTime = Date.now()

    const promptLength = messages.reduce((n, m) => n + (typeof m.content === 'string' ? m.content.length : 0), 0)
    const userMsg = messages.find((m) => m.role === 'user')
    const promptSnippet = typeof userMsg?.content === 'string' ? userMsg.content.slice(0, 500) : ''

    console.info('[PortfolioQA] AI execution started', {
      model: MODEL_SMART,
      question,
      contextSize: {
        companies: context.companies.length,
        updates: context.recentUpdates.length,
        trends: context.activeTrends.length,
        risks: context.activeRisks.length,
      },
      promptLength,
      promptSnippet,
    })

    try {
      const response = await client.chat.completions.create({
        model: MODEL_SMART,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        temperature: 0.25,
        max_tokens: 1500,
      })

      let outputText = ''
      let totalTokens = 0
      const encoder = new TextEncoder()

      return new ReadableStream<Uint8Array>({
        async start(controller) {
          let streamErr: unknown = null
          try {
            for await (const chunk of response) {
              const text = chunk.choices[0]?.delta?.content ?? ''
              if (text) {
                outputText += text
                controller.enqueue(encoder.encode(text))
              }
              if (chunk.usage) totalTokens = chunk.usage.total_tokens
            }
            console.info('[PortfolioQA] AI execution completed', {
              model: MODEL_SMART,
              durationMs: Date.now() - startTime,
              tokens: totalTokens,
              outputLength: outputText.length,
              output: outputText.slice(0, 500), // log first 500 chars
            })
          } catch (err) {
            streamErr = err
            console.error('[PortfolioQA] Stream read error', {
              durationMs: Date.now() - startTime,
              error: err instanceof Error ? err.message : String(err),
            })
          } finally {
            if (streamErr) {
              controller.error(streamErr instanceof Error ? streamErr : new Error(String(streamErr)))
            } else {
              controller.close()
            }
          }
        },
      })
    } catch (error) {
      console.error('[PortfolioQA] AI execution failed, falling back to rules', {
        model: MODEL_SMART,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      })
      return this.streamFallback(question, context)
    }
  }

  private streamFallback(question: string, context: AskContext): ReadableStream<Uint8Array> {
    const answer = this.buildRuleBasedAnswer(question, context)
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(answer))
        controller.close()
      },
    })
  }

  private truncate(text: string, maxLen: number): string {
    return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text
  }

  private formatCurrency(v: number): string {
    const sign = v < 0 ? '-' : ''
    const abs = Math.abs(v)
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`
    return `${sign}$${Math.round(abs)}`
  }

  private buildMessages(
    question: string,
    context: AskContext
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const fmt = (v: number) => this.formatCurrency(v)

    const cappedCompanies = context.companies.slice(0, MAX_COMPANIES_IN_PROMPT)
    const companiesBlock = cappedCompanies
      .map((c) => {
        const m = c.latestMetrics
        return `- [${c.name}] ${c.sector}/${c.stage} · Health: ${c.healthStatus} (${c.healthScore}) · MRR: ${m?.mrr ? fmt(m.mrr) : 'N/A'} · Growth: ${m?.revenueGrowthMom != null ? `${(m.revenueGrowthMom * 100).toFixed(1)}%` : 'N/A'} · Runway: ${m?.runway != null ? `${Math.floor(m.runway)}mo` : 'N/A'} · Burn: ${m?.burnRate ? fmt(m.burnRate) : 'N/A'}`
      })
      .join('\n') + (context.companies.length > MAX_COMPANIES_IN_PROMPT ? `\n(Showing ${MAX_COMPANIES_IN_PROMPT} of ${context.companies.length} companies)` : '')

    const fundBlock = `Total MRR: ${fmt(context.fundMetrics.totalMrr)} · ARR: ${fmt(context.fundMetrics.totalArr)} · Avg Growth: ${(context.fundMetrics.avgGrowth * 100).toFixed(1)}% · Avg Runway: ${Math.round(context.fundMetrics.avgRunway)}mo · Total Burn: ${fmt(context.fundMetrics.totalBurn)} · Headcount: ${context.fundMetrics.totalHeadcount}`

    const updatesBlock = context.recentUpdates.length > 0
      ? context.recentUpdates
          .slice(0, 10)
          .map((u) => `- [${u.companyName}] ${u.period}: Wins — "${this.truncate(u.wins, UPDATE_WINS_TRUNCATE)}". Risks — "${this.truncate(u.risks, UPDATE_RISKS_TRUNCATE)}".`)
          .join('\n')
      : 'No recent updates.'

    const trendsBlock = context.activeTrends.length > 0
      ? context.activeTrends
          .map((t) => `- ${t.severity}: ${t.title} (${t.affectedCount} companies) — ${this.truncate(t.summary, TREND_SUMMARY_TRUNCATE)}`)
          .join('\n')
      : 'No active trends.'

    const risksBlock = context.activeRisks.length > 0
      ? context.activeRisks
          .map((r) => `- [${r.companyName}] ${r.severity} ${r.category}: ${r.title}`)
          .join('\n')
      : 'No high-severity open risks.'

    const userMessage = `Portfolio data as of ${context.asOf}:

## Fund Metrics
${fundBlock}

## Portfolio Companies (${cappedCompanies.length} shown${context.companies.length > MAX_COMPANIES_IN_PROMPT ? ` of ${context.companies.length} active` : ' active'})
${companiesBlock}

## Recent Founder Updates
${updatesBlock}

## Active Trends
${trendsBlock}

## Active High/Critical Risks
${risksBlock}

---

Question: ${question}`

    return [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ]
  }

  private buildRuleBasedAnswer(question: string, context: AskContext): string {
    const q = question.toLowerCase()
    const fmt = (v: number) => this.formatCurrency(v)

    const runwayMatch = q.match(/runway\s+(?:under|below|less than|<)\s*(\d+)/)
    if (runwayMatch) {
      // Default 12 months if capture group is unexpectedly absent (shouldn't happen given the regex)
      const threshold = runwayMatch[1] !== undefined ? parseInt(runwayMatch[1], 10) : 12
      const matches = context.companies.filter(
        (c) => c.latestMetrics?.runway != null && c.latestMetrics.runway < threshold
      )
      if (matches.length === 0) return `No companies have runway under ${threshold} months.`
      const rows = matches
        .sort((a, b) => (a.latestMetrics?.runway ?? 0) - (b.latestMetrics?.runway ?? 0))
        .map((c) => `- **${c.name}** — ${Math.floor(c.latestMetrics?.runway ?? 0)} months (${c.healthStatus})`)
        .join('\n')
      return `## ${matches.length} Companies with Runway Under ${threshold} Months\n\n${rows}`
    }

    if (q.includes('at risk') || q.includes('at-risk')) {
      const atRisk = context.companies.filter((c) => c.healthStatus === 'AT_RISK')
      if (atRisk.length === 0) return 'No companies are currently classified as At Risk.'
      return `## At Risk Companies (${atRisk.length})\n\n${atRisk.map((c) => `- **${c.name}** — Health score: ${c.healthScore}, MRR: ${c.latestMetrics?.mrr ? fmt(c.latestMetrics.mrr) : 'N/A'}, Runway: ${c.latestMetrics?.runway ? `${Math.floor(c.latestMetrics.runway)}mo` : 'N/A'}`).join('\n')}`
    }

    if (q.includes('watchlist')) {
      const watchlist = context.companies.filter((c) => c.healthStatus === 'WATCHLIST')
      if (watchlist.length === 0) return 'No companies are currently on the Watchlist.'
      return `## Watchlist Companies (${watchlist.length})\n\n${watchlist.map((c) => `- **${c.name}** — Health score: ${c.healthScore}, Growth: ${c.latestMetrics?.revenueGrowthMom != null ? `${(c.latestMetrics.revenueGrowthMom * 100).toFixed(1)}%` : 'N/A'}`).join('\n')}`
    }

    if (q.includes('portfolio') || q.includes('fund') || q.includes('overview') || q.includes('summary')) {
      const healthy = context.companies.filter((c) => c.healthStatus === 'HEALTHY').length
      const watchlist = context.companies.filter((c) => c.healthStatus === 'WATCHLIST').length
      const atRisk = context.companies.filter((c) => c.healthStatus === 'AT_RISK').length
      return `## Portfolio Overview\n\n**${context.companies.length} active companies** as of ${context.asOf}\n\n- Total MRR: **${fmt(context.fundMetrics.totalMrr)}** (ARR: ${fmt(context.fundMetrics.totalArr)})\n- Avg MoM Growth: **${(context.fundMetrics.avgGrowth * 100).toFixed(1)}%**\n- Avg Runway: **${Math.round(context.fundMetrics.avgRunway)} months**\n- Total Burn: **${fmt(context.fundMetrics.totalBurn)}**\n\n**Health:** ${healthy} Healthy · ${watchlist} Watchlist · ${atRisk} At Risk`
    }

    if (q.includes('trend') || q.includes('pattern') || q.includes('theme')) {
      if (context.activeTrends.length === 0) return 'No active trends detected in the portfolio.'
      return `## Active Portfolio Trends\n\n${context.activeTrends.map((t) => `### ${t.title}\n*${t.severity} · ${t.category} · ${t.affectedCount} companies*\n\n${t.summary}`).join('\n\n')}`
    }

    return `I need an OpenAI API key configured to answer detailed questions about the portfolio.\n\nSet \`OPENAI_API_KEY\` in your environment to enable AI-powered Q&A.\n\n**What I can tell you from data:**\n- Portfolio has **${context.companies.length} active companies**\n- Total MRR: **${fmt(context.fundMetrics.totalMrr)}**\n- Avg Runway: **${Math.round(context.fundMetrics.avgRunway)} months**\n- Active trends: **${context.activeTrends.length}**\n- Active risks: **${context.activeRisks.length}**`
  }
}
