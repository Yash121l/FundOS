import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { db } from '@fundos/database'
import { PortfolioAnalyst, writeAIAuditLog } from '@fundos/ai'
import { computeHealthScore, classifyHealth } from '@fundos/analytics'
import { tasks } from '@trigger.dev/sdk/v3'
import { createHmac, timingSafeEqual } from 'crypto'
import { JSDOM } from 'jsdom'
import type { Company, MetricSnapshot, FounderUpdate, PortfolioAnalystInput } from '@fundos/types'

// ── Webhook authentication ────────────────────────────────────

function verifySignature(body: string, signatureHeader: string | null): boolean {
  const secret = process.env.EMAIL_WEBHOOK_SECRET
  // In production, always require a secret. In dev, allow unsigned requests
  // so you can test with curl without setting up HMAC.
  if (!secret) return process.env.NODE_ENV !== 'production'
  if (!signatureHeader) return false

  const expected = createHmac('sha256', secret).update(body).digest('hex')
  const expectedBuf = Buffer.from(`sha256=${expected}`, 'utf8')
  try {
    const sigBuf = Buffer.from(signatureHeader, 'utf8')
    // Length check before timingSafeEqual — the Node API throws when buffers
    // differ in length, which would leak timing info via exception timing.
    if (sigBuf.length !== expectedBuf.length) return false
    return timingSafeEqual(sigBuf, expectedBuf)
  } catch {
    return false
  }
}

// ── Text sanitization ─────────────────────────────────────────

function sanitizeText(raw: string): string {
  // DOMPurify requires a browser Window — can't use it in a Node.js API route.
  // JSDOM gives us a DOM environment; textContent extraction strips all tags safely.
  try {
    const dom = new JSDOM(`<body>${raw}</body>`)
    const text = dom.window.document.body.textContent ?? ''
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().slice(0, 10000)
  } catch {
    // Paranoid fallback if JSDOM fails on pathological input.
    return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 10000)
  }
}

// ── Rule-based structured extraction ─────────────────────────
//
// Extracts metrics and narrative from free-form email text without requiring
// an AI API key. Patterns are ordered most-specific → least-specific so the
// first match is always the best one.

interface ParsedUpdate {
  wins: string
  risks: string
  mrr: number | null
  burnRate: number | null
  cashBalance: number | null
  headcount: number | null
  hiringNeeds: string
  additionalNotes: string
  fundraisingStatus: 'NOT_RAISING' | 'EXPLORING' | 'ACTIVELY_RAISING' | 'TERM_SHEET' | 'CLOSED'
}

function extractUpdateFromEmail(text: string): ParsedUpdate {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const full = text

  function extractSection(patterns: RegExp[]): string {
    for (const pat of patterns) {
      const m = full.match(pat)
      if (m?.[1]) return m[1].trim()
    }
    return ''
  }

  function extractNumber(patterns: RegExp[]): number | null {
    for (const pat of patterns) {
      const m = full.match(pat)
      if (m?.[1]) {
        const raw = m[1].replace(/[,$\s]/g, '')
        const n = parseFloat(raw)
        if (!isNaN(n)) return n
      }
    }
    return null
  }

  const wins = extractSection([
    /wins?[:\s]+([\s\S]+?)(?=challenges?|risks?|metrics?|mrr|burn|$)/i,
    /highlights?[:\s]+([\s\S]+?)(?=challenges?|risks?|metrics?|$)/i,
    /good news[:\s]+([\s\S]+?)(?=challenges?|risks?|metrics?|$)/i,
  // Fall back to the first 3 lines of the email body.
  ]) || lines.slice(0, 3).join(' ')

  const risks = extractSection([
    /challenges?[:\s]+([\s\S]+?)(?=wins?|metrics?|mrr|burn|fundraising|$)/i,
    /risks?[:\s]+([\s\S]+?)(?=wins?|metrics?|mrr|burn|fundraising|$)/i,
    /concerns?[:\s]+([\s\S]+?)(?=wins?|metrics?|mrr|burn|fundraising|$)/i,
  ]) || 'No specific challenges mentioned in email.'

  const mrr = extractNumber([
    /mrr[:\s]+\$?([\d,.]+[km]?)/i,
    /monthly recurring revenue[:\s]+\$?([\d,.]+[km]?)/i,
    /revenue[:\s]+\$?([\d,.]+[km]?)/i,
  ])

  const burnRate = extractNumber([
    /burn[:\s]+\$?([\d,.]+[km]?)/i,
    /monthly burn[:\s]+\$?([\d,.]+[km]?)/i,
    /cash burn[:\s]+\$?([\d,.]+[km]?)/i,
  ])

  const cashBalance = extractNumber([
    /cash[:\s]+\$?([\d,.]+[km]?)/i,
    /cash balance[:\s]+\$?([\d,.]+[km]?)/i,
    /cash on hand[:\s]+\$?([\d,.]+[km]?)/i,
    /bank[:\s]+\$?([\d,.]+[km]?)/i,
  ])

  const headcount = extractNumber([
    /headcount[:\s]+([\d]+)/i,
    /team size[:\s]+([\d]+)/i,
    /employees[:\s]+([\d]+)/i,
    /(\d+)\s+(?:full[- ]time|FTE|people on (?:the )?team)/i,
  ])

  const hiringNeeds = extractSection([
    /hiring[:\s]+([\s\S]+?)(?=fundraising|raise|$)/i,
    /looking for[:\s]+([\s\S]+?)(?=fundraising|raise|$)/i,
  ])

  // Classify fundraising status by scanning for the most specific signal first.
  let fundraisingStatus: ParsedUpdate['fundraisingStatus'] = 'NOT_RAISING'
  const lower = text.toLowerCase()
  if (/term sheet/.test(lower)) fundraisingStatus = 'TERM_SHEET'
  else if (/closed (?:our|the) round|signed (?:our|the)/.test(lower)) fundraisingStatus = 'CLOSED'
  else if (/actively raising|in the market|fundraising process/.test(lower)) fundraisingStatus = 'ACTIVELY_RAISING'
  else if (/exploring|considering raising|thinking about/.test(lower)) fundraisingStatus = 'EXPLORING'
  else if (/not raising|not currently raising/.test(lower)) fundraisingStatus = 'NOT_RAISING'

  return {
    wins: wins.slice(0, 2000),
    risks: risks.slice(0, 2000),
    mrr,
    burnRate,
    cashBalance,
    // Round to nearest integer — fractional headcount makes no sense.
    headcount: headcount != null ? Math.round(headcount) : null,
    hiringNeeds: hiringNeeds.slice(0, 500),
    additionalNotes: '',
    fundraisingStatus,
  }
}

// ── Main handler ─────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Read the raw body first — signature verification must run against the
  // exact bytes received, before any JSON parsing changes the representation.
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Support both our own header name and GitHub/SendGrid's standard name.
  const sig = req.headers.get('x-webhook-signature') ?? req.headers.get('x-hub-signature-256')
  if (!verifySignature(rawBody, sig)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Normalise the sender field — different providers use different key names.
  const senderEmail = (
    (payload.from as string | undefined) ??
    (payload.sender as string | undefined) ??
    ''
  ).toLowerCase().trim()

  if (!senderEmail || !senderEmail.includes('@')) {
    return NextResponse.json({ error: 'Missing sender email' }, { status: 400 })
  }

  // Sanitize before any further processing — the email body is untrusted input.
  const rawText = sanitizeText(
    (payload.text as string | undefined) ??
    (payload.body as string | undefined) ??
    (payload.plain as string | undefined) ??
    ''
  )

  if (!rawText) {
    return NextResponse.json({ error: 'Empty email body' }, { status: 400 })
  }

  // Sender must be a FOUNDER with a linked company — reject unknown addresses
  // with a 422 (not 404) so the caller knows it's a data issue, not routing.
  const user = await db.user.findFirst({
    where: { email: senderEmail, role: 'FOUNDER' },
    select: { id: true, companyId: true, email: true, name: true },
  })

  if (!user?.companyId) {
    console.warn('[founder-update-webhook] Unknown sender or no linked company:', senderEmail)
    return NextResponse.json(
      { error: 'Sender not recognized as a founder with a linked company' },
      { status: 422 }
    )
  }

  const now = new Date()
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Idempotency guard — email providers sometimes retry on network timeouts.
  // Return 200 (not 201) so the retry stops without creating a duplicate.
  const existing = await db.founderUpdate.findFirst({
    where: { companyId: user.companyId, period },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json(
      { message: 'Update already exists for this period', updateId: existing.id },
      { status: 200 }
    )
  }

  const extracted = extractUpdateFromEmail(rawText)

  const runway =
    extracted.cashBalance != null && extracted.burnRate != null && extracted.burnRate > 0
      ? Math.round((extracted.cashBalance / extracted.burnRate) * 10) / 10
      : null

  const prevSnapshot = await db.metricSnapshot.findFirst({
    where: { companyId: user.companyId },
    orderBy: { period: 'desc' },
    select: { mrr: true },
  })
  const revenueGrowthMom =
    extracted.mrr != null && prevSnapshot?.mrr != null && prevSnapshot.mrr > 0
      ? (extracted.mrr - prevSnapshot.mrr) / prevSnapshot.mrr
      : null

  // Write both records atomically — the background job reads the metric
  // snapshot immediately and would fail if only the update existed.
  const [update] = await db.$transaction([
    db.founderUpdate.create({
      data: {
        companyId: user.companyId,
        period,
        submittedById: user.id,
        mrr: extracted.mrr,
        burnRate: extracted.burnRate,
        cashBalance: extracted.cashBalance,
        runway,
        headcount: extracted.headcount,
        fundraisingStatus: extracted.fundraisingStatus,
        wins: extracted.wins,
        risks: extracted.risks,
        hiringNeeds: extracted.hiringNeeds || null,
        additionalNotes: extracted.additionalNotes || null,
        source: 'EMAIL',
        senderEmail,
        // Store raw content for auditability and potential re-extraction.
        rawEmailContent: rawText.slice(0, 10000),
      },
    }),
    db.metricSnapshot.upsert({
      where: { companyId_period: { companyId: user.companyId, period } },
      create: {
        companyId: user.companyId, period,
        mrr: extracted.mrr, arr: extracted.mrr != null ? extracted.mrr * 12 : null,
        burnRate: extracted.burnRate, cashBalance: extracted.cashBalance,
        runway, headcount: extracted.headcount, revenueGrowthMom,
        source: 'FOUNDER_UPDATE',
      },
      update: {
        mrr: extracted.mrr, arr: extracted.mrr != null ? extracted.mrr * 12 : null,
        burnRate: extracted.burnRate, cashBalance: extracted.cashBalance,
        runway, headcount: extracted.headcount, revenueGrowthMom,
        source: 'FOUNDER_UPDATE',
      },
    }),
  ])

  // Analysis failure must not fail the webhook response — the update record
  // already exists and the sender should not retry because of an AI error.
  try {
    await tasks.trigger('process-founder-update', { updateId: update.id, companyId: user.companyId })
  } catch {
    try {
      await runInlineAnalysis(update.id, user.companyId)
    } catch (analysisErr) {
      console.error('[founder-update-webhook] inline analysis failed', analysisErr)
    }
  }

  return NextResponse.json({ success: true, updateId: update.id, period }, { status: 201 })
}

// ── Inline analysis fallback ──────────────────────────────────
// Mirrors the logic in process-founder-update.ts — kept here so the webhook
// remains fully self-contained when Trigger.dev is not configured.

async function runInlineAnalysis(updateId: string, companyId: string): Promise<void> {
  const [update, company, metricsHistory, previousUpdates] = await Promise.all([
    db.founderUpdate.findUniqueOrThrow({ where: { id: updateId } }),
    db.company.findUniqueOrThrow({ where: { id: companyId } }),
    db.metricSnapshot.findMany({ where: { companyId }, orderBy: { period: 'desc' }, take: 6 }),
    db.founderUpdate.findMany({ where: { companyId, id: { not: updateId } }, orderBy: { period: 'desc' }, take: 3 }),
  ])

  const startedAt = Date.now()
  const analyst = new PortfolioAnalyst()
  const analysis = await analyst.analyze({
    company: company as unknown as Company,
    latestUpdate: update as unknown as PortfolioAnalystInput['latestUpdate'],
    metricsHistory: metricsHistory as unknown as MetricSnapshot[],
    previousUpdates: previousUpdates as unknown as FounderUpdate[],
  })

  await writeAIAuditLog({
    service: 'PortfolioAnalyst',
    model: process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : 'rule-based-v1',
    promptTokens: 0,
    completionTokens: 0,
    durationMs: Date.now() - startedAt,
    entityType: 'FounderUpdate',
    entityId: updateId,
    input: { companyId, period: update.period, source: 'EMAIL' },
    output: { risksDetected: analysis.risks.length },
    createdAt: new Date(),
  })

  if (analysis.risks.length > 0) {
    await db.risk.createMany({
      data: analysis.risks.map((r) => ({
        companyId, updateId,
        title: r.title, description: r.description,
        severity: r.severity, category: r.category,
        source: r.source ?? 'ai', status: r.status,
      })),
      skipDuplicates: true,
    })
  }

  const healthResult = computeHealthScore(metricsHistory as unknown as MetricSnapshot[])
  await db.company.update({
    where: { id: companyId },
    data: { healthScore: healthResult.score, healthStatus: classifyHealth(healthResult.score) },
  })

  await db.founderUpdate.update({
    where: { id: updateId },
    data: {
      aiSummary: analysis.healthSummary,
      founderTone: analysis.founderTone ?? null,
      aiProcessedAt: new Date(),
    },
  })
}
