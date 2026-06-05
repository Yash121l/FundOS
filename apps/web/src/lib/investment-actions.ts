'use server'

import { db } from '@fundos/database'
import { revalidatePath } from 'next/cache'

async function revalidateCompany(companyId: string) {
  const co = await db.company.findUnique({ where: { id: companyId }, select: { slug: true } })
  revalidatePath('/portfolio')
  if (co?.slug) revalidatePath(`/portfolio/${co.slug}`)
}

const VALID_ROUND_TYPES = new Set(['PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'SERIES_D', 'SERIES_E', 'BRIDGE', 'CONVERTIBLE', 'SAFE', 'OTHER'])
const VALID_SECURITY_TYPES = new Set(['COMMON', 'PREFERRED', 'SAFE', 'CONVERTIBLE_NOTE', 'WARRANT', 'OTHER'])
const VALID_VALUATION_METHODS = new Set(['LAST_ROUND', 'ARR_MULTIPLE', 'DCF', 'PWERM', 'OPM', 'NET_ASSETS'])
const VALID_MARK_STATUSES = new Set(['DRAFT', 'REVIEWED', 'APPROVED'])

function validateRoundType(value: string): boolean {
  return VALID_ROUND_TYPES.has(value)
}

// ── Module D: Funding Round ───────────────────────────────────

export interface FundingRoundData {
  companyId: string
  roundName: string
  roundType: string
  closeDate: string
  preMoney: number | null
  postMoney: number | null
  roundSize: number | null
  pricePerShare: number | null
  shareClass: string
  optionPoolPct: number | null
  leadInvestor: string
  notes: string
}

export async function createFundingRound(data: FundingRoundData): Promise<{ success: boolean; id: string }> {
  if (!validateRoundType(data.roundType)) {
    throw new Error(`Invalid roundType: ${data.roundType}`)
  }
  try {
    const round = await db.fundingRound.create({
      data: {
        companyId: data.companyId,
        roundName: data.roundName,
        roundType: data.roundType as never,
        closeDate: new Date(data.closeDate),
        preMoney: data.preMoney,
        postMoney: data.postMoney,
        roundSize: data.roundSize,
        pricePerShare: data.pricePerShare,
        shareClass: data.shareClass || null,
        optionPoolPct: data.optionPoolPct,
        leadInvestor: data.leadInvestor || null,
        notes: data.notes || null,
      },
    })
    await revalidateCompany(data.companyId)
    return { success: true, id: round.id }
  } catch (err) {
    console.error('[createFundingRound] failed', err)
    return { success: false, id: '' }
  }
}

export async function updateFundingRound(id: string, data: Omit<FundingRoundData, 'companyId'>): Promise<{ success: boolean }> {
  const round = await db.fundingRound.findUniqueOrThrow({ where: { id }, select: { companyId: true } })
  await db.fundingRound.update({
    where: { id },
    data: {
      roundName: data.roundName,
      roundType: validateRoundType(data.roundType) ? data.roundType as never : (() => { throw new Error(`Invalid roundType: ${data.roundType}`) })(),
      closeDate: new Date(data.closeDate),
      preMoney: data.preMoney,
      postMoney: data.postMoney,
      roundSize: data.roundSize,
      pricePerShare: data.pricePerShare,
      shareClass: data.shareClass || null,
      optionPoolPct: data.optionPoolPct,
      leadInvestor: data.leadInvestor || null,
      notes: data.notes || null,
    },
  })
  await revalidateCompany(round.companyId)
  return { success: true }
}

export async function deleteFundingRound(id: string): Promise<{ success: boolean }> {
  const round = await db.fundingRound.findUniqueOrThrow({ where: { id }, select: { companyId: true } })
  await db.fundingRound.delete({ where: { id } })
  await revalidateCompany(round.companyId)
  return { success: true }
}

// ── Module D: Fund Investment (our stake) ─────────────────────

export interface FundInvestmentData {
  companyId: string
  roundId: string | null
  investmentDate: string
  securityType: string
  amountInvested: number
  sharesAcquired: number | null
  entryPricePerShare: number | null
  ownershipPctBasic: number | null
  ownershipPctFullyDiluted: number | null
  proRataRight: boolean
  boardSeat: boolean
  boardObserver: boolean
  followOnReserve: number | null
  notes: string
}

export async function createFundInvestment(data: FundInvestmentData): Promise<{ success: boolean; id: string }> {
  if (!VALID_SECURITY_TYPES.has(data.securityType)) {
    throw new Error(`Invalid securityType: ${data.securityType}`)
  }
  const inv = await db.fundInvestment.create({
    data: {
      companyId: data.companyId,
      roundId: data.roundId || null,
      investmentDate: new Date(data.investmentDate),
      securityType: data.securityType as never,
      amountInvested: data.amountInvested,
      sharesAcquired: data.sharesAcquired,
      entryPricePerShare: data.entryPricePerShare,
      ownershipPctBasic: data.ownershipPctBasic,
      ownershipPctFullyDiluted: data.ownershipPctFullyDiluted,
      proRataRight: data.proRataRight,
      boardSeat: data.boardSeat,
      boardObserver: data.boardObserver,
      followOnReserve: data.followOnReserve,
      notes: data.notes || null,
    },
  })
  await revalidateCompany(data.companyId)
  return { success: true, id: inv.id }
}

export async function deleteFundInvestment(id: string): Promise<{ success: boolean }> {
  const inv = await db.fundInvestment.findUniqueOrThrow({ where: { id }, select: { companyId: true } })
  await db.fundInvestment.delete({ where: { id } })
  await revalidateCompany(inv.companyId)
  return { success: true }
}

// ── Module D: Valuation Mark ──────────────────────────────────

export interface ValuationMarkData {
  investmentId: string
  companyId: string
  markDate: string
  fairValue: number
  valuationMethod: string
  methodologyNote: string
  revenueMultipleUsed: number | null
  comparableSet: string
  impliedValuation: number | null
  status: string
}

export async function saveValuationMark(data: ValuationMarkData): Promise<{ success: boolean; id: string }> {
  if (!VALID_VALUATION_METHODS.has(data.valuationMethod)) {
    return { success: false, id: '' }
  }
  if (!VALID_MARK_STATUSES.has(data.status)) {
    return { success: false, id: '' }
  }
  const mark = await db.valuationMark.create({
    data: {
      investmentId: data.investmentId,
      companyId: data.companyId,
      markDate: new Date(data.markDate),
      fairValue: data.fairValue,
      valuationMethod: data.valuationMethod as never,
      methodologyNote: data.methodologyNote || null,
      revenueMultipleUsed: data.revenueMultipleUsed,
      comparableSet: data.comparableSet || null,
      impliedValuation: data.impliedValuation,
      status: data.status as never,
    },
  })
  await revalidateCompany(data.companyId)
  revalidatePath('/fund')
  return { success: true, id: mark.id }
}

export async function approveValuationMark(id: string, approvedBy: string): Promise<{ success: boolean }> {
  const mark = await db.valuationMark.update({
    where: { id },
    data: { status: 'APPROVED', approvedBy },
  })
  await revalidateCompany(mark.companyId)
  revalidatePath('/fund')
  return { success: true }
}
