'use server'

import { db } from '@fundos/database'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from './auth'

const VALID_WATERFALL_TYPES = new Set(['EUROPEAN', 'AMERICAN', 'DEAL_BY_DEAL'])

function parseSafeDate(value: string | null): Date | null {
  if (!value) return null
  const ts = Date.parse(value)
  if (isNaN(ts)) return null
  return new Date(ts)
}

// ── Module F: Fund Profile ─────────────────────────────────────

export interface FundProfileData {
  name: string
  vintage: number
  committedCapital: number
  managementFeePct: number
  carryPct: number
  hurdleRate: number
  waterfallType: string
  investmentPeriodEnd: string | null
  fundTermEnd: string | null
  currency: string
}

export async function saveFundProfile(data: FundProfileData): Promise<{ success: boolean; id: string }> {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'PM')) {
    return { success: false, id: '' }
  }

  if (!VALID_WATERFALL_TYPES.has(data.waterfallType)) {
    return { success: false, id: '' }
  }

  const investmentPeriodEnd = parseSafeDate(data.investmentPeriodEnd)
  const fundTermEnd = parseSafeDate(data.fundTermEnd)

  // upsert on first row (single-fund assumption)
  const existing = await db.fundProfile.findFirst()

  let id: string
  if (existing) {
    await db.fundProfile.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        vintage: data.vintage,
        committedCapital: data.committedCapital,
        managementFeePct: data.managementFeePct,
        carryPct: data.carryPct,
        hurdleRate: data.hurdleRate,
        waterfallType: data.waterfallType as never,
        investmentPeriodEnd,
        fundTermEnd,
        currency: data.currency,
      },
    })
    id = existing.id
  } else {
    const profile = await db.fundProfile.create({
      data: {
        name: data.name,
        vintage: data.vintage,
        committedCapital: data.committedCapital,
        managementFeePct: data.managementFeePct,
        carryPct: data.carryPct,
        hurdleRate: data.hurdleRate,
        waterfallType: data.waterfallType as never,
        investmentPeriodEnd,
        fundTermEnd,
        currency: data.currency,
      },
    })
    id = profile.id
  }

  revalidatePath('/fund')
  return { success: true, id }
}

// ── Module F: Capital Activity ─────────────────────────────────

export interface CapitalActivityData {
  fundId: string
  date: string
  type: string
  amount: number
  description: string
  lpName: string
}

const VALID_CAPITAL_ACTIVITY_TYPES = new Set(['CAPITAL_CALL', 'DISTRIBUTION', 'MANAGEMENT_FEE', 'OTHER'])

export async function createCapitalActivity(data: CapitalActivityData): Promise<{ success: boolean; id: string }> {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'PM')) {
    return { success: false, id: '' }
  }

  const date = parseSafeDate(data.date)
  if (!date) return { success: false, id: '' }

  if (!VALID_CAPITAL_ACTIVITY_TYPES.has(data.type)) {
    return { success: false, id: '' }
  }

  try {
    const activity = await db.capitalActivity.create({
      data: {
        fundId: data.fundId,
        date,
        type: data.type as never,
        amount: data.amount,
        description: data.description || null,
        lpName: data.lpName || null,
      },
    })
    revalidatePath('/fund')
    return { success: true, id: activity.id }
  } catch (err) {
    console.error('[createCapitalActivity] failed', err)
    return { success: false, id: '' }
  }
}

export async function deleteCapitalActivity(id: string): Promise<{ success: boolean }> {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'PM')) {
    return { success: false }
  }

  try {
    await db.capitalActivity.delete({ where: { id } })
    revalidatePath('/fund')
    return { success: true }
  } catch (err) {
    console.error('[deleteCapitalActivity] failed', err)
    return { success: false }
  }
}
