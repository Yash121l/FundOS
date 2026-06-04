import type { MeetingBriefInput, MeetingBrief } from '@fundos/types'
import { getOpenAIClient, MODEL_FAST } from './client'

const SYSTEM_PROMPT = `You are preparing a VC partner for a founder check-in call.
Write a concise, actionable meeting brief. Be direct and specific.
Format each section as clear prose or a tight bullet list — never both.
Do not pad. Every sentence must be decision-relevant.`

export class MeetingPrepAgent {
  async generate(input: MeetingBriefInput): Promise<MeetingBrief> {
    const client = getOpenAIClient()
    if (client) return this.generateWithAI(input, client)
    return this.generateRuleBased(input)
  }

  private truncateAtWord(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text
    const truncated = text.slice(0, maxLen)
    const lastSpace = truncated.lastIndexOf(' ')
    return lastSpace > maxLen * 0.8 ? truncated.slice(0, lastSpace) + '...' : truncated + '...'
  }

  private formatCurrency(v: number): string {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
    return `$${v}`
  }

  private buildMeetingPrompt(input: MeetingBriefInput): string {
    const { company, metricsHistory, recentUpdates, openRisks, pendingActions } = input
    const lastUpdate = recentUpdates[0] ?? null
    const fmt = (v: number) => this.formatCurrency(v)

    const metricsBlock = metricsHistory
      .slice(0, 3)
      .map((m) => `${m.period}: MRR ${m.mrr ? fmt(m.mrr) : 'N/A'} · Growth ${m.revenueGrowthMom != null ? `${(m.revenueGrowthMom * 100).toFixed(1)}%` : 'N/A'} · Runway ${m.runway ? `${Math.floor(m.runway)}mo` : 'N/A'} · Health ${m.healthScore ?? 'N/A'}`)
      .join('\n')

    const risksBlock = openRisks.length > 0
      ? openRisks.map((r) => `- ${r.severity} ${r.category}: ${r.title} [${r.status}]`).join('\n')
      : 'None open.'

    const actionsBlock = pendingActions.length > 0
      ? pendingActions.map((a) => `- ${a.priority}: ${a.title} [${a.status}]`).join('\n')
      : 'No pending actions.'

    const updateBlock = lastUpdate
      ? `Period: ${lastUpdate.period}\nTone: ${lastUpdate.founderTone ?? 'unknown'}\nWins: ${this.truncateAtWord(lastUpdate.wins, 200)}\nRisks: ${this.truncateAtWord(lastUpdate.risks, 200)}\nFundraising: ${lastUpdate.fundraisingStatus}`
      : 'No recent update on file.'

    return `Prepare a meeting brief for a VC partner calling ${company.name} (${company.sector}, ${company.stage}).

HEALTH: ${company.healthStatus} — score ${company.healthScore}/100
${company.description ? `DESCRIPTION: ${company.description}` : ''}

METRICS (last 3 periods):
${metricsBlock}

LATEST FOUNDER UPDATE:
${updateBlock}

OPEN RISKS:
${risksBlock}

PENDING ACTIONS:
${actionsBlock}

Write a JSON object with these exact string fields:
{
  "healthTrajectory": "2-3 sentences: what the metrics show about the trajectory. Is it improving, stable, or declining? What is the key signal?",
  "openRisksSection": "Concise prose covering the most important open risks. Prioritise by severity. 2-4 sentences.",
  "pendingActionsSection": "What needs follow-up from the fund team. Bullet list or brief prose. Skip if none.",
  "discussionTopics": ["topic 1", "topic 2", "topic 3", "topic 4"],
  "questionsToAsk": ["question 1", "question 2", "question 3", "question 4", "question 5"]
}`
  }

  private async generateWithAI(
    input: MeetingBriefInput,
    client: NonNullable<ReturnType<typeof getOpenAIClient>>
  ): Promise<MeetingBrief> {
    const { company } = input
    const prompt = this.buildMeetingPrompt(input)

    try {
      const startTime = Date.now()
      const response = await client.chat.completions.create({
        model: MODEL_FAST,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      })
      const output = response.choices[0]?.message?.content ?? ''
      console.info('[AI] meeting-prep', {
        model: MODEL_FAST,
        companyId: company.id,
        companyName: company.name,
        healthStatus: company.healthStatus,
        durationMs: Date.now() - startTime,
        tokens: response.usage,
        promptLength: prompt.length,
        promptSnippet: prompt.slice(0, 300),
        outputLength: output.length,
        output: output.slice(0, 300),
      })

      const raw = JSON.parse(output) as Partial<{
        healthTrajectory: string
        openRisksSection: string
        pendingActionsSection: string
        discussionTopics: string[]
        questionsToAsk: string[]
      }>

      const fallback = this.generateRuleBased(input)
      return {
        companyName: company.name,
        generatedAt: new Date(),
        healthTrajectory: raw.healthTrajectory ?? fallback.healthTrajectory,
        openRisksSection: raw.openRisksSection ?? fallback.openRisksSection,
        pendingActionsSection: raw.pendingActionsSection ?? fallback.pendingActionsSection,
        discussionTopics: Array.isArray(raw.discussionTopics) ? raw.discussionTopics : fallback.discussionTopics,
        questionsToAsk: Array.isArray(raw.questionsToAsk) ? raw.questionsToAsk : fallback.questionsToAsk,
      }
    } catch (err) {
      console.error('[AI] meeting-prep AI generation failed, falling back to rule-based', {
        model: MODEL_FAST,
        companyId: company.id,
        error: err instanceof Error ? err.message : String(err),
      })
      return this.generateRuleBased(input)
    }
  }

  private generateRuleBased(input: MeetingBriefInput): MeetingBrief {
    const { company, metricsHistory, openRisks, pendingActions, recentUpdates } = input
    const fmt = (v: number) => this.formatCurrency(v)

    const latest = metricsHistory[0] ?? null
    const prev = metricsHistory[2] ?? null

    let trajectory = `${company.name} is currently classified as **${company.healthStatus}** with a health score of ${company.healthScore}/100.`
    if (latest && prev) {
      const mrrChange = (latest.mrr ?? 0) - (prev.mrr ?? 0)
      const runwayChange = (latest.runway ?? 0) - (prev.runway ?? 0)
      if (mrrChange > 0) trajectory += ` MRR has grown from ${fmt(prev.mrr ?? 0)} to ${fmt(latest.mrr ?? 0)} over 3 months.`
      else if (mrrChange < 0) trajectory += ` MRR has declined from ${fmt(prev.mrr ?? 0)} to ${fmt(latest.mrr ?? 0)} over 3 months — investigate root cause.`
      if (latest.runway != null) {
        const runwayTrend = runwayChange > 1 ? ' (improving)' : runwayChange < -1 ? ' (declining)' : ''
        trajectory += ` Current runway: ${Math.floor(latest.runway)} months${runwayTrend}.`
      }
    } else if (latest) {
      if (latest.mrr != null) trajectory += ` Latest MRR: ${fmt(latest.mrr)}.`
      if (latest.runway != null) trajectory += ` Runway: ${Math.floor(latest.runway)} months.`
    }

    const criticalRisks = openRisks.filter((r) => r.severity === 'CRITICAL' || r.severity === 'HIGH')
    let risksSection = ''
    if (criticalRisks.length === 0) {
      risksSection = 'No high-severity risks are currently open.'
    } else {
      risksSection = criticalRisks
        .slice(0, 4)
        .map((r) => `**${r.severity} — ${r.category}:** ${r.title} [${r.status}]`)
        .join('\n\n')
    }

    const pendingHigh = pendingActions.filter((a) => a.priority === 'HIGH' && a.status !== 'COMPLETED')
    let actionsSection = ''
    if (pendingHigh.length === 0 && pendingActions.length === 0) {
      actionsSection = 'No pending actions from the fund team.'
    } else {
      const items = pendingHigh.length > 0 ? pendingHigh : pendingActions.slice(0, 3)
      actionsSection = items.map((a) => `- [${a.priority}] ${a.title}`).join('\n')
    }

    const topics: string[] = []
    if (company.healthStatus === 'AT_RISK') topics.push('Path to recovery — what changed and what is the plan?')
    if (latest?.runway != null && latest.runway < 12) topics.push(`Runway is ${Math.floor(latest.runway)} months — fundraising plan and timeline`)
    if (latest?.revenueGrowthMom != null && latest.revenueGrowthMom < 0) topics.push('Revenue decline — root cause and customer health')
    topics.push('Key milestones for next 90 days')
    topics.push('Team and hiring priorities')
    if (topics.length < 4) topics.push('Partnership and business development opportunities')

    const questions: string[] = []
    if (latest?.runway != null && latest.runway < 12) {
      questions.push('What is your fundraising timeline and who are you speaking to?')
    }
    if (openRisks.length > 0) {
      questions.push(`On the ${openRisks[0]?.title} risk — what progress has been made since last quarter?`)
    }
    questions.push('What does the team need most from us in the next 30 days?')
    questions.push('Are there any unreported concerns that are not in the last update?')
    questions.push('What would make the next quarter a success?')
    if (questions.length < 5) questions.push('How is team morale and retention?')

    const lastUpdate = recentUpdates[0]
    if (lastUpdate?.founderTone === 'distressed' || lastUpdate?.founderTone === 'cautious') {
      questions.unshift('The last update read as cautious — is there anything we should know about?')
    }

    return {
      companyName: company.name,
      generatedAt: new Date(),
      healthTrajectory: trajectory,
      openRisksSection: risksSection,
      pendingActionsSection: actionsSection,
      discussionTopics: topics.slice(0, 5),
      questionsToAsk: questions.slice(0, 6),
    }
  }
}
