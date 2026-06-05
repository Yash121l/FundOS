'use server'

import { db } from '@fundos/database'
import { Prisma } from '@fundos/database'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from './auth'

// ── Board Meeting CRUD ────────────────────────────────────────────────────────

export async function createBoardMeeting(data: {
  companyId: string
  type: 'QUARTERLY' | 'SPECIAL' | 'ANNUAL' | 'LPAC'
  meetingDate: Date
  agenda?: string
  attendees?: string[]
  location?: string
}): Promise<{ success: boolean; meetingId: string }> {
  const meeting = await db.boardMeeting.create({
    data: {
      companyId: data.companyId,
      type: data.type,
      status: 'SCHEDULED',
      meetingDate: data.meetingDate,
      agenda: data.agenda ?? null,
      attendees: data.attendees ?? Prisma.DbNull,
      location: data.location ?? null,
    },
  })
  revalidatePath('/board')
  return { success: true, meetingId: meeting.id }
}

export async function saveBoardMinutes(
  meetingId: string,
  minutesContent: string,
  nextQuarterPlan?: string
): Promise<{ success: boolean }> {
  await db.boardMeeting.update({
    where: { id: meetingId },
    data: {
      minutesContent,
      nextQuarterPlan: nextQuarterPlan ?? null,
      status: 'HELD',
    },
  })
  revalidatePath('/board')
  return { success: true }
}

export async function createBoardResolution(data: {
  meetingId: string
  title: string
  description?: string
  proposedBy?: string
  outcome: 'APPROVED' | 'REJECTED' | 'TABLED' | 'NOTED'
  votesFor?: number
  votesAgainst?: number
  votesAbstain?: number
  notes?: string
}): Promise<{ success: boolean }> {
  await db.boardResolution.create({
    data: {
      meetingId: data.meetingId,
      title: data.title,
      description: data.description ?? null,
      proposedBy: data.proposedBy ?? null,
      outcome: data.outcome,
      votesFor: data.votesFor ?? 0,
      votesAgainst: data.votesAgainst ?? 0,
      votesAbstain: data.votesAbstain ?? 0,
      notes: data.notes ?? null,
    },
  })
  revalidatePath('/board')
  return { success: true }
}

// ── Follow-on Notes ───────────────────────────────────────────────────────────

export async function createFollowOnNote(data: {
  companyId: string
  period: string
  recommendation: 'FOLLOW_ON' | 'PASS' | 'BRIDGE' | 'WATCH'
  amount?: number
  rationale: string
  keyMetrics?: Prisma.InputJsonValue
}): Promise<{ success: boolean; noteId: string }> {
  const user = await getCurrentUser()
  const note = await db.followOnNote.create({
    data: {
      companyId: data.companyId,
      period: data.period,
      recommendation: data.recommendation,
      amount: data.amount ?? null,
      rationale: data.rationale,
      keyMetrics: data.keyMetrics ?? Prisma.DbNull,
      status: 'DRAFT',
      preparedById: user?.id ?? null,
    },
  })
  revalidatePath('/board')
  return { success: true, noteId: note.id }
}

export async function submitFollowOnToIC(noteId: string): Promise<{ success: boolean }> {
  await db.followOnNote.update({
    where: { id: noteId },
    data: { status: 'IC_SUBMITTED', submittedToICAt: new Date() },
  })
  revalidatePath('/board')
  return { success: true }
}

export async function resolveFollowOnNote(
  noteId: string,
  outcome: 'APPROVED' | 'DECLINED',
  icNotes?: string
): Promise<{ success: boolean }> {
  await db.followOnNote.update({
    where: { id: noteId },
    data: {
      status: outcome === 'APPROVED' ? 'APPROVED' : 'DECLINED',
      resolvedAt: new Date(),
      icNotes: icNotes ?? null,
    },
  })
  revalidatePath('/board')
  return { success: true }
}

// ── Value-Add Activities ──────────────────────────────────────────────────────

export async function logValueAddActivity(data: {
  companyId: string
  type: 'TALENT_INTRO' | 'CUSTOMER_BD' | 'PR_FACILITATION' | 'FUNDRAISE_COACHING' | 'CO_INVESTOR_INTRO' | 'REGULATORY_GUIDANCE' | 'OTHER'
  title: string
  description?: string
  outcome?: string
  activityDate?: Date
}): Promise<{ success: boolean }> {
  const user = await getCurrentUser()
  await db.valueAddActivity.create({
    data: {
      companyId: data.companyId,
      type: data.type,
      status: 'COMPLETED',
      title: data.title,
      description: data.description ?? null,
      outcome: data.outcome ?? null,
      activityDate: data.activityDate ?? new Date(),
      createdById: user?.id ?? null,
    },
  })
  revalidatePath('/board')
  return { success: true }
}

// ── Annual Valuation ──────────────────────────────────────────────────────────

export async function createAnnualValuation(data: {
  companyId: string
  year: number
  fairValue: number
  previousFairValue?: number
  method: 'LAST_ROUND' | 'ARR_MULTIPLE' | 'DCF' | 'PWERM' | 'OPM' | 'NET_ASSETS'
  revenueMultiple?: number
  comparableSet?: string
  methodologyNote?: string
  impliedValuation?: number
  navImpact?: number
}): Promise<{ success: boolean }> {
  const changePercent =
    data.previousFairValue != null && data.previousFairValue > 0
      ? (data.fairValue - data.previousFairValue) / data.previousFairValue
      : null

  await db.annualValuation.upsert({
    where: { companyId_year: { companyId: data.companyId, year: data.year } },
    create: {
      companyId: data.companyId, year: data.year,
      fairValue: data.fairValue,
      previousFairValue: data.previousFairValue ?? null,
      changePercent,
      method: data.method,
      revenueMultiple: data.revenueMultiple ?? null,
      comparableSet: data.comparableSet ?? null,
      methodologyNote: data.methodologyNote ?? null,
      impliedValuation: data.impliedValuation ?? null,
      navImpact: data.navImpact ?? null,
      status: 'DRAFT',
    },
    update: {
      fairValue: data.fairValue,
      previousFairValue: data.previousFairValue ?? null,
      changePercent,
      method: data.method,
      revenueMultiple: data.revenueMultiple ?? null,
      comparableSet: data.comparableSet ?? null,
      methodologyNote: data.methodologyNote ?? null,
      impliedValuation: data.impliedValuation ?? null,
      navImpact: data.navImpact ?? null,
    },
  })
  revalidatePath('/board')
  return { success: true }
}

export async function approveValuation(valuationId: string): Promise<{ success: boolean }> {
  const user = await getCurrentUser()
  await db.annualValuation.update({
    where: { id: valuationId },
    data: { status: 'APPROVED', approvedById: user?.id ?? null, approvedAt: new Date() },
  })
  revalidatePath('/board')
  return { success: true }
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getBoardDashboard() {
  const [meetings, followOnNotes, valueAdd, valuations] = await Promise.all([
    db.boardMeeting.findMany({
      orderBy: { meetingDate: 'desc' },
      take: 20,
      include: {
        company: { select: { id: true, name: true, slug: true, healthStatus: true } },
        resolutions: true,
      },
    }),
    db.followOnNote.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        company: { select: { id: true, name: true, slug: true } },
        preparedBy: { select: { name: true } },
      },
    }),
    db.valueAddActivity.findMany({
      orderBy: { activityDate: 'desc' },
      take: 20,
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
    }),
    db.annualValuation.findMany({
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      take: 20,
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
    }),
  ])
  return { meetings, followOnNotes, valueAdd, valuations }
}

export type BoardDashboard = Awaited<ReturnType<typeof getBoardDashboard>>
