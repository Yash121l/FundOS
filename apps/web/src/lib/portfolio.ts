import { db } from '@fundos/database'

function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Portfolio table ────────────────────────────────────────

export async function getAllCompanies() {
  const period = currentPeriod()

  return db.company.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      slug: true,
      sector: true,
      stage: true,
      healthStatus: true,
      healthScore: true,
      description: true,
      website: true,
      foundedYear: true,
      metrics: {
        where: { period },
        select: {
          mrr: true,
          arr: true,
          revenueGrowthMom: true,
          burnRate: true,
          runway: true,
          headcount: true,
        },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  })
}

export type CompanyRow = Awaited<ReturnType<typeof getAllCompanies>>[number]

// ── Company detail ─────────────────────────────────────────

export async function getCompanyBySlug(slug: string) {
  return db.company.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      sector: true,
      stage: true,
      country: true,
      healthStatus: true,
      healthScore: true,
      description: true,
      website: true,
      foundedYear: true,
      metrics: {
        orderBy: { period: 'desc' },
        take: 13,
        select: {
          period: true,
          mrr: true,
          arr: true,
          revenueGrowthMom: true,
          revenueGrowthYoy: true,
          burnRate: true,
          cashBalance: true,
          runway: true,
          headcount: true,
          headcountChange: true,
          healthScore: true,
          grossMargin: true,
          nrr: true,
        },
      },
      updates: {
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          period: true,
          createdAt: true,
          reviewedAt: true,
          aiSummary: true,
          wins: true,
          risks: true,
          mrr: true,
          burnRate: true,
          runway: true,
          headcount: true,
          fundraisingStatus: true,
        },
      },
      risks: {
        where: { status: { not: 'DISMISSED' } },
        orderBy: [{ status: 'asc' }, { severity: 'desc' }],
        select: {
          id: true,
          title: true,
          description: true,
          severity: true,
          category: true,
          status: true,
          source: true,
          resolvedAt: true,
        },
      },
    },
  })
}

export type CompanyDetail = NonNullable<Awaited<ReturnType<typeof getCompanyBySlug>>>

export async function getCompanySignals(companyId: string) {
  return db.marketSignal.findMany({
    where: { companies: { some: { companyId } } },
    orderBy: { publishedAt: 'desc' },
    take: 6,
    select: {
      id: true,
      title: true,
      summary: true,
      source: true,
      category: true,
      publishedAt: true,
      url: true,
    },
  })
}

export type SignalItem = Awaited<ReturnType<typeof getCompanySignals>>[number]
