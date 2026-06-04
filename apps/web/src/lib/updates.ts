import { db } from '@fundos/database'

// ── Inbox ────────────────────────────────────────────────────

export type InboxFilter = 'all' | 'unreviewed' | 'reviewed'

export async function getUpdatesForInbox(filter: InboxFilter = 'all') {
  const where =
    filter === 'unreviewed' ? { reviewedAt: null } :
    filter === 'reviewed'   ? { reviewedAt: { not: null } } :
    {}

  const updates = await db.founderUpdate.findMany({
    where,
    orderBy: [
      { reviewedAt: { sort: 'asc', nulls: 'first' } },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      period: true,
      createdAt: true,
      reviewedAt: true,
      aiSummary: true,
      founderTone: true,
      mrr: true,
      burnRate: true,
      runway: true,
      headcount: true,
      wins: true,
      risks: true,
      fundraisingStatus: true,
      company: {
        select: {
          id: true, name: true, slug: true,
          healthStatus: true, sector: true, stage: true,
        },
      },
      detectedRisks: {
        where: { status: 'OPEN' },
        select: { id: true, title: true, description: true, severity: true, category: true, status: true },
        orderBy: { severity: 'desc' },
        take: 3,
      },
    },
  })

  return updates
}

export type InboxUpdate = Awaited<ReturnType<typeof getUpdatesForInbox>>[number]

// ── Full detail for review sheet ─────────────────────────────

export async function getUpdateDetail(id: string) {
  return db.founderUpdate.findUnique({
    where: { id },
    select: {
      id: true,
      period: true,
      createdAt: true,
      reviewedAt: true,
      aiSummary: true,
      founderTone: true,
      mrr: true,
      burnRate: true,
      cashBalance: true,
      runway: true,
      headcount: true,
      wins: true,
      risks: true,
      hiringNeeds: true,
      additionalNotes: true,
      fundraisingStatus: true,
      fundraisingNote: true,
      company: {
        select: {
          id: true, name: true, slug: true,
          healthStatus: true, sector: true, stage: true,
        },
      },
      detectedRisks: {
        select: { id: true, title: true, description: true, severity: true, category: true, status: true },
        orderBy: [{ severity: 'desc' }, { status: 'asc' }],
      },
      opportunities: {
        where: { status: 'OPEN' },
        select: { id: true, title: true, description: true, category: true },
      },
    },
  })
}

export type UpdateDetail = NonNullable<Awaited<ReturnType<typeof getUpdateDetail>>>

// ── Companies for the form company selector ──────────────────

export async function getCompaniesForForm() {
  return db.company.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true, name: true, slug: true, sector: true, stage: true,
      metrics: {
        orderBy: { period: 'desc' },
        take: 1,
        select: { mrr: true, burnRate: true, cashBalance: true, runway: true, headcount: true, period: true },
      },
      updates: {
        select: { period: true },
        orderBy: { period: 'desc' },
        take: 6,
      },
    },
    orderBy: { name: 'asc' },
  })
}

export type CompanyForForm = Awaited<ReturnType<typeof getCompaniesForForm>>[number]
