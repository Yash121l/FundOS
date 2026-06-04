import { db } from '@fundos/database'

// ── Report list ──────────────────────────────────────────────

export async function getLPReports() {
  return db.lPReport.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      quarter: true,
      status: true,
      version: true,
      createdAt: true,
      companies: {
        select: { companyId: true },
      },
    },
  })
}

export type LPReportListItem = Awaited<ReturnType<typeof getLPReports>>[number]

// ── Report detail ────────────────────────────────────────────

export async function getLPReportById(id: string) {
  return db.lPReport.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      quarter: true,
      status: true,
      version: true,
      markdownContent: true,
      createdAt: true,
      updatedAt: true,
      sections: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          content: true,
          order: true,
          aiGenerated: true,
          editedAt: true,
        },
      },
      companies: {
        select: {
          company: {
            select: { id: true, name: true, slug: true, sector: true, stage: true, healthStatus: true },
          },
        },
      },
    },
  })
}

export type LPReportDetail = NonNullable<Awaited<ReturnType<typeof getLPReportById>>>
export type ReportSection = LPReportDetail['sections'][number]

// ── Companies for the form multi-select ─────────────────────

export async function getCompaniesForReport() {
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
    },
    orderBy: { name: 'asc' },
  })
}

export type CompanyForReport = Awaited<ReturnType<typeof getCompaniesForReport>>[number]

// ── Quarter options (last 8 quarters) ────────────────────────

export function getQuarterOptions(): string[] {
  const options: string[] = []
  const now = new Date()
  let year = now.getFullYear()
  let quarter = Math.ceil((now.getMonth() + 1) / 3)

  for (let i = 0; i < 8; i++) {
    options.push(`${year}-Q${quarter}`)
    quarter--
    if (quarter === 0) { quarter = 4; year-- }
  }
  return options
}
