'use server'

import { db } from '@fundos/database'
import { revalidatePath } from 'next/cache'
import { slugify } from '@fundos/shared'
import { getCurrentUser } from './auth'

// ── Module A: Add / Edit Company ──────────────────────────────

export interface CreateCompanyData {
  name: string
  sector: string
  stage: string
  country: string
  website: string
  foundedYear: number | null
  description: string
  status: string
  healthStatus: string
}

const MAX_SLUG_ATTEMPTS = 100

const VALID_SECTORS = new Set(['SAAS', 'FINTECH', 'AI', 'DEVTOOLS', 'CLIMATETECH', 'HEALTHTECH', 'MARKETPLACE', 'INFRASTRUCTURE', 'OTHER'])
const VALID_STAGES = new Set(['PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'GROWTH'])

function validateEnums(data: Pick<CreateCompanyData, 'sector' | 'stage'>) {
  if (!VALID_SECTORS.has(data.sector)) throw new Error(`Invalid sector: ${data.sector}`)
  if (!VALID_STAGES.has(data.stage)) throw new Error(`Invalid stage: ${data.stage}`)
}

export async function createCompany(data: CreateCompanyData): Promise<{ success: boolean; slug: string }> {
  validateEnums(data)
  const user = await getCurrentUser()
  const base = slugify(data.name)

  // ensure uniqueness with an attempt limit
  let slug = base
  let attempts = 0
  while (await db.company.findUnique({ where: { slug } })) {
    if (++attempts >= MAX_SLUG_ATTEMPTS) {
      throw new Error(`Unable to generate unique slug for base: ${base}`)
    }
    slug = `${base}-${attempts}`
  }

  const company = await db.$transaction(async (tx) => {
    const created = await tx.company.create({
      data: {
        name: data.name,
        slug,
        sector: data.sector as never,
        stage: data.stage as never,
        country: data.country || 'US',
        website: data.website || null,
        foundedYear: data.foundedYear,
        description: data.description || null,
        status: data.status as never,
        healthStatus: data.healthStatus as never,
      },
    })

    await tx.auditLog.create({
      data: {
        userId: user?.id ?? null,
        action: 'CREATE_COMPANY',
        entityType: 'Company',
        entityId: created.id,
        metadata: { name: data.name },
      },
    })

    return created
  })

  revalidatePath('/portfolio')
  return { success: true, slug: company.slug }
}

export interface UpdateCompanyData {
  id: string
  name: string
  sector: string
  stage: string
  country: string
  website: string
  foundedYear: number | null
  description: string
  status: string
  healthStatus: string
  logoUrl: string
}

export async function updateCompany(data: UpdateCompanyData): Promise<{ success: boolean }> {
  validateEnums(data)
  const user = await getCurrentUser()

  await db.company.update({
    where: { id: data.id },
    data: {
      name: data.name,
      sector: data.sector as never,
      stage: data.stage as never,
      country: data.country || 'US',
      website: data.website || null,
      foundedYear: data.foundedYear,
      description: data.description || null,
      status: data.status as never,
      healthStatus: data.healthStatus as never,
      logoUrl: data.logoUrl || null,
    },
  })

  await db.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: 'UPDATE_COMPANY',
      entityType: 'Company',
      entityId: data.id,
      metadata: { name: data.name },
    },
  })

  revalidatePath('/portfolio')
  revalidatePath(`/portfolio/${data.id}`)
  return { success: true }
}

// ── Module A: Log Metric Snapshot ─────────────────────────────

export interface MetricSnapshotData {
  companyId: string
  period: string
  mrr: number | null
  burnRate: number | null
  cashBalance: number | null
  runway: number | null
  grossMargin: number | null
  nrr: number | null
  grr: number | null
  headcount: number | null
}

export async function logMetricSnapshot(data: MetricSnapshotData): Promise<{ success: boolean }> {
  if (data.mrr != null && (!Number.isFinite(data.mrr) || data.mrr < 0)) {
    return { success: false }
  }
  if (data.burnRate != null && (!Number.isFinite(data.burnRate) || data.burnRate < 0)) {
    return { success: false }
  }
  if (data.cashBalance != null && (!Number.isFinite(data.cashBalance) || data.cashBalance < 0)) {
    return { success: false }
  }
  if (data.runway != null && (!Number.isFinite(data.runway) || data.runway < 0)) {
    return { success: false }
  }

  const arr = data.mrr != null ? data.mrr * 12 : null
  const runway = data.runway != null
    ? data.runway
    : data.cashBalance != null && data.burnRate != null && data.burnRate > 0
      ? Math.round((data.cashBalance / data.burnRate) * 10) / 10
      : null

  // compute MoM growth from previous period
  const prev = await db.metricSnapshot.findFirst({
    where: { companyId: data.companyId },
    orderBy: { period: 'desc' },
    select: { mrr: true },
  })
  const revenueGrowthMom =
    data.mrr != null && prev?.mrr != null && prev.mrr > 0
      ? (data.mrr - prev.mrr) / prev.mrr
      : null

  await db.metricSnapshot.upsert({
    where: { companyId_period: { companyId: data.companyId, period: data.period } },
    create: {
      companyId: data.companyId,
      period: data.period,
      mrr: data.mrr,
      arr,
      burnRate: data.burnRate,
      cashBalance: data.cashBalance,
      runway,
      grossMargin: data.grossMargin,
      nrr: data.nrr,
      grr: data.grr,
      headcount: data.headcount,
      revenueGrowthMom,
      source: 'MANUAL',
    },
    update: {
      mrr: data.mrr,
      arr,
      burnRate: data.burnRate,
      cashBalance: data.cashBalance,
      runway,
      grossMargin: data.grossMargin,
      nrr: data.nrr,
      grr: data.grr,
      headcount: data.headcount,
      revenueGrowthMom,
      source: 'MANUAL',
    },
  })

  revalidatePath(`/portfolio/${data.companyId}`)
  return { success: true }
}
