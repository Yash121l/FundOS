'use server'

import { db } from '@fundos/database'
import { revalidatePath } from 'next/cache'

const VALID_HOLDER_TYPES = new Set(['FOUNDER', 'EMPLOYEE', 'INVESTOR', 'OPTION_POOL', 'OTHER'])
const VALID_ANTI_DILUTION = new Set(['NONE', 'BROAD_BASED', 'NARROW_BASED', 'FULL_RATCHET'])
const VALID_SAFE_TYPES = new Set(['PRE_MONEY', 'POST_MONEY', 'MFN'])
const VALID_NOTE_STATUSES = new Set(['OUTSTANDING', 'CONVERTED', 'REDEEMED', 'CANCELLED'])

// ── Module E: Cap Table Entry ─────────────────────────────────

export interface CapTableEntryData {
  companyId: string
  roundId: string | null
  holderName: string
  holderType: string
  shareClass: string
  sharesIssued: number
  ownershipPctBasic: number | null
  ownershipPctFullyDiluted: number | null
  liquidationPreference: number | null
  participating: boolean
  antiDilution: string
  votingRightsPerShare: number
  boardSeat: boolean
}

export async function createCapTableEntry(data: CapTableEntryData): Promise<{ success: boolean; id: string; error?: string }> {
  if (!VALID_HOLDER_TYPES.has(data.holderType)) {
    return { success: false, id: '', error: `Invalid holderType: ${data.holderType}` }
  }
  if (!VALID_ANTI_DILUTION.has(data.antiDilution)) {
    return { success: false, id: '', error: `Invalid antiDilution: ${data.antiDilution}` }
  }
  const entry = await db.capTableEntry.create({
    data: {
      companyId: data.companyId,
      roundId: data.roundId || null,
      holderName: data.holderName,
      holderType: data.holderType as never,
      shareClass: data.shareClass,
      sharesIssued: data.sharesIssued,
      ownershipPctBasic: data.ownershipPctBasic,
      ownershipPctFullyDiluted: data.ownershipPctFullyDiluted,
      liquidationPreference: data.liquidationPreference,
      participating: data.participating,
      antiDilution: data.antiDilution as never,
      votingRightsPerShare: data.votingRightsPerShare,
      boardSeat: data.boardSeat,
    },
  })
  revalidatePath(`/portfolio/${data.companyId}`)
  return { success: true, id: entry.id }
}

export async function deleteCapTableEntry(id: string): Promise<{ success: boolean }> {
  const entry = await db.capTableEntry.findUniqueOrThrow({ where: { id } })
  await db.capTableEntry.delete({ where: { id } })
  revalidatePath(`/portfolio/${entry.companyId}`)
  return { success: true }
}

// ── Module E: SAFE Note ───────────────────────────────────────

export interface SafeNoteData {
  companyId: string
  investorName: string
  amount: number
  issueDate: string
  safeType: string
  valuationCap: number | null
  discountRate: number | null
  mfn: boolean
  proRataRight: boolean
  triggerAmount: number | null
}

export async function createSafeNote(data: SafeNoteData): Promise<{ success: boolean; id: string; error?: string }> {
  if (!VALID_SAFE_TYPES.has(data.safeType)) {
    return { success: false, id: '', error: `Invalid safeType: ${data.safeType}` }
  }
  const note = await db.safeNote.create({
    data: {
      companyId: data.companyId,
      investorName: data.investorName,
      amount: data.amount,
      issueDate: new Date(data.issueDate),
      safeType: data.safeType as never,
      valuationCap: data.valuationCap,
      discountRate: data.discountRate,
      mfn: data.mfn,
      proRataRight: data.proRataRight,
      triggerAmount: data.triggerAmount,
    },
  })
  revalidatePath(`/portfolio/${data.companyId}`)
  return { success: true, id: note.id }
}

export async function updateSafeNoteStatus(id: string, status: string, conversionRoundId?: string): Promise<{ success: boolean }> {
  if (!VALID_NOTE_STATUSES.has(status)) {
    throw new Error(`Invalid safe note status: ${status}`)
  }
  const note = await db.safeNote.update({
    where: { id },
    data: {
      status: status as never,
      conversionRoundId: conversionRoundId || null,
    },
  })
  revalidatePath(`/portfolio/${note.companyId}`)
  return { success: true }
}

export async function deleteSafeNote(id: string): Promise<{ success: boolean }> {
  const note = await db.safeNote.findUniqueOrThrow({ where: { id } })
  await db.safeNote.delete({ where: { id } })
  revalidatePath(`/portfolio/${note.companyId}`)
  return { success: true }
}

// ── Module E: Convertible Note ────────────────────────────────

export interface ConvertibleNoteData {
  companyId: string
  investorName: string
  principal: number
  issueDate: string
  maturityDate: string | null
  interestRate: number | null
  interestType: string
  valuationCap: number | null
  discountRate: number | null
  mfn: boolean
}

export async function createConvertibleNote(data: ConvertibleNoteData): Promise<{ success: boolean; id: string }> {
  const note = await db.convertibleNote.create({
    data: {
      companyId: data.companyId,
      investorName: data.investorName,
      principal: data.principal,
      issueDate: new Date(data.issueDate),
      maturityDate: data.maturityDate ? new Date(data.maturityDate) : null,
      interestRate: data.interestRate,
      interestType: data.interestType || null,
      valuationCap: data.valuationCap,
      discountRate: data.discountRate,
      mfn: data.mfn,
    },
  })
  revalidatePath(`/portfolio/${data.companyId}`)
  return { success: true, id: note.id }
}

export async function deleteConvertibleNote(id: string): Promise<{ success: boolean }> {
  const note = await db.convertibleNote.findUniqueOrThrow({ where: { id } })
  await db.convertibleNote.delete({ where: { id } })
  revalidatePath(`/portfolio/${note.companyId}`)
  return { success: true }
}

// ── Module E: Option Pool ─────────────────────────────────────

export interface OptionPoolData {
  companyId: string
  roundId: string | null
  authorizedShares: number
  grantedShares: number
  vestedShares: number
  exercisedShares: number
}

export async function saveOptionPool(data: OptionPoolData): Promise<{ success: boolean }> {
  await db.optionPool.create({
    data: {
      companyId: data.companyId,
      roundId: data.roundId || null,
      authorizedShares: data.authorizedShares,
      grantedShares: data.grantedShares,
      vestedShares: data.vestedShares,
      exercisedShares: data.exercisedShares,
    },
  })
  revalidatePath(`/portfolio/${data.companyId}`)
  return { success: true }
}
