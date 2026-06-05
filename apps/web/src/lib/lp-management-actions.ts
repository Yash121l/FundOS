'use server'

import { db } from '@fundos/database'
import { revalidatePath } from 'next/cache'

// ── LP Entity CRUD ────────────────────────────────────────────────────────────

export async function createLPEntity(data: {
  name: string
  entityType: 'INDIVIDUAL' | 'FAMILY_OFFICE' | 'INSTITUTIONAL' | 'FUND_OF_FUNDS' | 'SOVEREIGN_WEALTH' | 'ENDOWMENT' | 'CORPORATE' | 'OTHER'
  jurisdiction?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  capitalCommitment: number
}): Promise<{ success: boolean; lpId: string }> {
  const lp = await db.lPEntity.create({
    data: {
      name: data.name,
      entityType: data.entityType,
      jurisdiction: data.jurisdiction ?? null,
      contactName: data.contactName ?? null,
      contactEmail: data.contactEmail ?? null,
      contactPhone: data.contactPhone ?? null,
      capitalCommitment: data.capitalCommitment,
      unfundedCommitment: data.capitalCommitment,
      kycStatus: 'NOT_STARTED',
      fatfStatus: 'CLEAR',
    },
  })
  revalidatePath('/lp-reports')
  return { success: true, lpId: lp.id }
}

export async function updateKYCStatus(
  lpId: string,
  kycStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'EXPIRED',
  opts?: { kycExpiresAt?: Date; amlClearanceDate?: Date; fatfStatus?: 'CLEAR' | 'GREYLIST' | 'BLACKLIST'; pepCheck?: boolean; sanctionsCheck?: boolean }
): Promise<{ success: boolean }> {
  await db.lPEntity.update({
    where: { id: lpId },
    data: {
      kycStatus,
      kycCompletedAt: kycStatus === 'APPROVED' ? new Date() : null,
      kycExpiresAt: opts?.kycExpiresAt ?? null,
      amlClearanceDate: opts?.amlClearanceDate ?? null,
      fatfStatus: opts?.fatfStatus ?? 'CLEAR',
      pepCheck: opts?.pepCheck ?? false,
      sanctionsCheck: opts?.sanctionsCheck ?? false,
    },
  })
  revalidatePath('/lp-reports')
  return { success: true }
}

export async function signLPAgreement(
  lpId: string,
  version: string
): Promise<{ success: boolean }> {
  await db.lPEntity.update({
    where: { id: lpId },
    data: { agreementSignedAt: new Date(), agreementVersion: version },
  })
  revalidatePath('/lp-reports')
  return { success: true }
}

export async function grantLPPortalAccess(lpId: string): Promise<{ success: boolean }> {
  await db.lPEntity.update({
    where: { id: lpId },
    data: { portalAccessGrantedAt: new Date() },
  })
  revalidatePath('/lp-reports')
  return { success: true }
}

// ── Capital Calls ─────────────────────────────────────────────────────────────

export async function createCapitalCall(data: {
  fundId: string
  callNumber: number
  callDate: Date
  dueDays?: number  // defaults to 12 business days ≈ 17 calendar days
  totalAmount: number
  purpose: string
  wireInstructions?: string
  notes?: string
}): Promise<{ success: boolean; callId: string }> {
  const dueDays = data.dueDays ?? 17
  const dueDate = new Date(data.callDate)
  dueDate.setDate(dueDate.getDate() + dueDays)

  // Get all LPs and their pro-rata shares
  const lps = await db.lPEntity.findMany({
    where: { kycStatus: 'APPROVED', agreementSignedAt: { not: null } },
    select: { id: true, capitalCommitment: true },
  })

  const totalCommitment = lps.reduce((s, lp) => s + lp.capitalCommitment, 0)

  const call = await db.capitalCall.create({
    data: {
      fundId: data.fundId,
      callNumber: data.callNumber,
      callDate: data.callDate,
      dueDate,
      totalAmount: data.totalAmount,
      purpose: data.purpose,
      wireInstructions: data.wireInstructions ?? null,
      notes: data.notes ?? null,
      status: 'DRAFT',
    },
  })

  // Create per-LP allocations
  if (lps.length > 0 && totalCommitment > 0) {
    await db.capitalCallAllocation.createMany({
      data: lps.map((lp) => {
        const proRataShare = lp.capitalCommitment / totalCommitment
        const amountDue = data.totalAmount * proRataShare
        return {
          callId: call.id,
          lpEntityId: lp.id,
          proRataShare,
          amountDue,
          amountPaid: 0,
          status: 'PENDING',
        }
      }),
    })
  }

  revalidatePath('/lp-reports')
  return { success: true, callId: call.id }
}

export async function issueCapitalCall(callId: string): Promise<{ success: boolean }> {
  await db.capitalCall.update({
    where: { id: callId },
    data: { status: 'ISSUED', issuedAt: new Date() },
  })
  revalidatePath('/lp-reports')
  return { success: true }
}

export async function recordLPPayment(
  allocationId: string,
  amountPaid: number
): Promise<{ success: boolean }> {
  const alloc = await db.capitalCallAllocation.findUniqueOrThrow({
    where: { id: allocationId },
    select: { amountDue: true, amountPaid: true, callId: true, lpEntityId: true },
  })

  const delta = amountPaid - alloc.amountPaid
  const isPaid = amountPaid >= alloc.amountDue
  await db.capitalCallAllocation.update({
    where: { id: allocationId },
    data: {
      amountPaid,
      paidAt: isPaid ? new Date() : null,
      status: isPaid ? 'PAID' : 'PENDING',
    },
  })

  // Update LP entity capital called by the delta only (not the full new amount)
  if (delta !== 0) {
    await db.lPEntity.update({
      where: { id: alloc.lpEntityId },
      data: {
        capitalCalled: { increment: delta },
        unfundedCommitment: { decrement: delta },
      },
    })
  }

  // Check if entire call is fully paid
  const allocations = await db.capitalCallAllocation.findMany({
    where: { callId: alloc.callId },
    select: { amountDue: true, amountPaid: true },
  })
  const totalDue = allocations.reduce((s, a) => s + a.amountDue, 0)
  const totalPaid = allocations.reduce((s, a) => s + a.amountPaid, 0)
  if (totalPaid >= totalDue) {
    await db.capitalCall.update({ where: { id: alloc.callId }, data: { status: 'FULLY_PAID' } })
  } else if (totalPaid > 0) {
    await db.capitalCall.update({ where: { id: alloc.callId }, data: { status: 'PARTIALLY_PAID' } })
  }

  revalidatePath('/lp-reports')
  return { success: true }
}

// ── Distributions ─────────────────────────────────────────────────────────────

export async function createDistribution(data: {
  fundId: string
  distributionDate: Date
  totalAmount: number
  type: 'RETURN_OF_CAPITAL' | 'PREFERRED_RETURN' | 'CARRIED_INTEREST' | 'RESIDUAL'
  description?: string
  relatedCompanyId?: string
}): Promise<{ success: boolean; distributionId: string }> {
  const dist = await db.distribution.create({
    data: {
      fundId: data.fundId,
      distributionDate: data.distributionDate,
      totalAmount: data.totalAmount,
      type: data.type,
      description: data.description ?? null,
      relatedCompanyId: data.relatedCompanyId ?? null,
      taxDocStatus: 'PENDING',
    },
  })

  // Get all approved LPs with commitment
  const lps = await db.lPEntity.findMany({
    where: { kycStatus: 'APPROVED', agreementSignedAt: { not: null } },
    select: { id: true, capitalCommitment: true },
  })
  const totalCommitment = lps.reduce((s, lp) => s + lp.capitalCommitment, 0)

  if (lps.length > 0 && totalCommitment > 0) {
    // Load fund profile for configurable waterfall percentages
    const fund = await db.fundProfile.findFirst({
      where: { id: data.fundId },
      select: { carryPct: true, hurdleRate: true },
    })
    const carryPct = fund?.carryPct ?? 0.20
    const hurdleRate = fund?.hurdleRate ?? 0.08

    await db.distributionAllocation.createMany({
      data: lps.map((lp) => {
        const proRataShare = lp.capitalCommitment / totalCommitment
        const grossAmount = data.totalAmount * proRataShare

        let returnOfCapital = 0
        let preferredReturn = 0
        let carry = 0

        if (data.type === 'RETURN_OF_CAPITAL') {
          returnOfCapital = grossAmount
        } else if (data.type === 'PREFERRED_RETURN') {
          // LP receives hurdleRate proportion as preferred return, rest as return of capital
          preferredReturn = grossAmount * hurdleRate
          returnOfCapital = grossAmount * (1 - hurdleRate)
        } else if (data.type === 'CARRIED_INTEREST') {
          // GP takes carryPct, LPs get rest as preferred return
          carry = grossAmount * carryPct
          preferredReturn = grossAmount * (1 - carryPct)
        } else {
          // Residual: return of capital first, then preferred, then carry
          returnOfCapital = grossAmount * (1 - hurdleRate - carryPct)
          preferredReturn = grossAmount * hurdleRate
          carry = grossAmount * carryPct
        }

        const netAmount = grossAmount  // taxes computed separately
        return {
          distributionId: dist.id,
          lpEntityId: lp.id,
          proRataShare,
          grossAmount,
          returnOfCapital,
          preferredReturn,
          carry,
          netAmount,
          taxWithheld: 0,
        }
      }),
    })

    // Update LP entity capital distributed
    await Promise.all(
      lps.map((lp) => {
        const proRataShare = lp.capitalCommitment / totalCommitment
        const grossAmount = data.totalAmount * proRataShare
        return db.lPEntity.update({
          where: { id: lp.id },
          data: { capitalDistributed: { increment: grossAmount } },
        })
      })
    )
  }

  revalidatePath('/lp-reports')
  return { success: true, distributionId: dist.id }
}

// ── LPAC Meetings ─────────────────────────────────────────────────────────────

export async function createLPACMeeting(data: {
  fundId: string
  type: 'CONFLICT_REVIEW' | 'VALUATION_APPROVAL' | 'MATERIAL_DECISION' | 'ROUTINE' | 'ANNUAL'
  meetingDate: Date
  agenda?: string
  location?: string
  memberLPIds?: string[]
}): Promise<{ success: boolean; meetingId: string }> {
  const meeting = await db.lPACMeeting.create({
    data: {
      fundId: data.fundId,
      type: data.type,
      status: 'SCHEDULED',
      meetingDate: data.meetingDate,
      agenda: data.agenda ?? null,
      location: data.location ?? null,
    },
  })

  if (data.memberLPIds && data.memberLPIds.length > 0) {
    await db.lPACMembership.createMany({
      data: data.memberLPIds.map((lpId) => ({
        meetingId: meeting.id,
        lpEntityId: lpId,
        attended: false,
      })),
    })
  }

  revalidatePath('/lp-reports')
  return { success: true, meetingId: meeting.id }
}

export async function saveLPACMinutes(
  meetingId: string,
  minutesContent: string,
  quorumMet: boolean
): Promise<{ success: boolean }> {
  await db.lPACMeeting.update({
    where: { id: meetingId },
    data: { minutesContent, quorumMet, status: 'HELD' },
  })
  revalidatePath('/lp-reports')
  return { success: true }
}

export async function createLPACResolution(data: {
  meetingId: string
  type: 'CONFLICT_WAIVER' | 'VALUATION_SIGN_OFF' | 'FOLLOW_ON_CONSENT' | 'FUND_EXTENSION' | 'OTHER'
  title: string
  description?: string
  outcome: 'APPROVED' | 'REJECTED' | 'TABLED' | 'NOTED'
  votesFor?: number
  votesAgainst?: number
  notes?: string
}): Promise<{ success: boolean }> {
  await db.lPACResolution.create({
    data: {
      meetingId: data.meetingId,
      type: data.type,
      title: data.title,
      description: data.description ?? null,
      outcome: data.outcome,
      votesFor: data.votesFor ?? 0,
      votesAgainst: data.votesAgainst ?? 0,
      notes: data.notes ?? null,
    },
  })
  revalidatePath('/lp-reports')
  return { success: true }
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getLPManagementData() {
  const [lpEntities, capitalCalls, distributions, lpacMeetings, fundProfile] = await Promise.all([
    db.lPEntity.findMany({
      orderBy: { name: 'asc' },
      include: {
        callAllocations: {
          select: { amountDue: true, amountPaid: true, status: true },
        },
        distAllocations: {
          select: { grossAmount: true, netAmount: true },
        },
      },
    }),
    db.capitalCall.findMany({
      orderBy: { callDate: 'desc' },
      take: 20,
      include: {
        allocations: {
          include: {
            lpEntity: { select: { id: true, name: true } },
          },
        },
      },
    }),
    db.distribution.findMany({
      orderBy: { distributionDate: 'desc' },
      take: 20,
      include: {
        allocations: {
          include: {
            lpEntity: { select: { id: true, name: true } },
          },
        },
      },
    }),
    db.lPACMeeting.findMany({
      orderBy: { meetingDate: 'desc' },
      take: 10,
      include: {
        resolutions: true,
        members: {
          include: { lpEntity: { select: { id: true, name: true } } },
        },
      },
    }),
    db.fundProfile.findFirst(),
  ])

  return { lpEntities, capitalCalls, distributions, lpacMeetings, fundProfile }
}

export type LPManagementData = Awaited<ReturnType<typeof getLPManagementData>>
