'use server'

import { db } from '@fundos/database'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from './auth'

// ── Module C: MRR Bridge ──────────────────────────────────────

export interface MrrBridgeData {
  companyId: string
  period: string
  beginningMrr: number
  newMrr: number
  expansionMrr: number
  reactivationMrr: number
  contractionMrr: number
  churnedMrr: number
  newCustomers: number | null
  churnedCustomers: number | null
  totalCustomers: number | null
}

export async function logMrrBridge(data: MrrBridgeData): Promise<{ success: boolean }> {
  const user = await getCurrentUser()
  if (!user) return { success: false }

  if (!data.companyId || !data.period) return { success: false }

  const numericFields: (keyof MrrBridgeData)[] = [
    'beginningMrr', 'newMrr', 'expansionMrr', 'reactivationMrr', 'contractionMrr', 'churnedMrr',
  ]
  for (const field of numericFields) {
    const v = data[field] as number
    if (!Number.isFinite(v) || v < 0) return { success: false }
  }
  if (data.newCustomers != null && (!Number.isFinite(data.newCustomers) || data.newCustomers < 0)) return { success: false }
  if (data.churnedCustomers != null && (!Number.isFinite(data.churnedCustomers) || data.churnedCustomers < 0)) return { success: false }
  if (data.totalCustomers != null && (!Number.isFinite(data.totalCustomers) || data.totalCustomers < 0)) return { success: false }

  const endingMrr =
    data.beginningMrr +
    data.newMrr +
    data.expansionMrr +
    data.reactivationMrr -
    data.contractionMrr -
    data.churnedMrr

  await db.mrrBridge.upsert({
    where: { companyId_period: { companyId: data.companyId, period: data.period } },
    create: {
      companyId: data.companyId,
      period: data.period,
      beginningMrr: data.beginningMrr,
      newMrr: data.newMrr,
      expansionMrr: data.expansionMrr,
      reactivationMrr: data.reactivationMrr,
      contractionMrr: data.contractionMrr,
      churnedMrr: data.churnedMrr,
      endingMrr,
      newCustomers: data.newCustomers,
      churnedCustomers: data.churnedCustomers,
      totalCustomers: data.totalCustomers,
    },
    update: {
      beginningMrr: data.beginningMrr,
      newMrr: data.newMrr,
      expansionMrr: data.expansionMrr,
      reactivationMrr: data.reactivationMrr,
      contractionMrr: data.contractionMrr,
      churnedMrr: data.churnedMrr,
      endingMrr,
      newCustomers: data.newCustomers,
      churnedCustomers: data.churnedCustomers,
      totalCustomers: data.totalCustomers,
    },
  })

  revalidatePath(`/portfolio/${data.companyId}`)
  return { success: true }
}

// ── Module C: Unit Economics ──────────────────────────────────

export interface UnitEconomicsData {
  companyId: string
  period: string
  cac: number | null
  ltv: number | null
  cacPaybackMonths: number | null
  arpa: number | null
  acv: number | null
  newCacRatio: number | null
  smSpend: number | null
  newCustomers: number | null
}

export async function logUnitEconomics(data: UnitEconomicsData): Promise<{ success: boolean }> {
  const user = await getCurrentUser()
  if (!user) return { success: false }

  if (!data.companyId || !data.period) return { success: false }

  const optionalNumericFields: (keyof UnitEconomicsData)[] = [
    'cac', 'ltv', 'cacPaybackMonths', 'arpa', 'acv', 'newCacRatio', 'smSpend', 'newCustomers',
  ]
  for (const field of optionalNumericFields) {
    const v = data[field] as number | null
    if (v != null && !Number.isFinite(v)) return { success: false }
  }
  if (data.cac != null && data.cac < 0) return { success: false }
  if (data.ltv != null && data.ltv < 0) return { success: false }

  const ltvCacRatio =
    data.ltv != null && data.cac != null && data.cac > 0 ? data.ltv / data.cac : null

  await db.unitEconomics.upsert({
    where: { companyId_period: { companyId: data.companyId, period: data.period } },
    create: {
      companyId: data.companyId,
      period: data.period,
      cac: data.cac,
      ltv: data.ltv,
      ltvCacRatio,
      cacPaybackMonths: data.cacPaybackMonths,
      arpa: data.arpa,
      acv: data.acv,
      newCacRatio: data.newCacRatio,
      smSpend: data.smSpend,
      newCustomers: data.newCustomers,
    },
    update: {
      cac: data.cac,
      ltv: data.ltv,
      ltvCacRatio,
      cacPaybackMonths: data.cacPaybackMonths,
      arpa: data.arpa,
      acv: data.acv,
      newCacRatio: data.newCacRatio,
      smSpend: data.smSpend,
      newCustomers: data.newCustomers,
    },
  })

  revalidatePath(`/portfolio/${data.companyId}`)
  return { success: true }
}
