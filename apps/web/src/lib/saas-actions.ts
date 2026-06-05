'use server'

import { db } from '@fundos/database'
import { revalidatePath } from 'next/cache'

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
