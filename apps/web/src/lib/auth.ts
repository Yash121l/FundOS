// No 'use server' here — these functions are called from server components and layouts
// directly, not from client-side form actions. 'use server' would require every export
// to be async and would make sync helpers (isInternalRole, canWrite) illegal.

import { auth, clerkClient } from '@clerk/nextjs/server'
import { db } from '@fundos/database'
import { redirect } from 'next/navigation'

// ── Role helpers ─────────────────────────────────────────────

export type AppRole = 'ANALYST' | 'PARTNER' | 'PORTFOLIO_OPS' | 'FINANCE' | 'FOUNDER' | 'LP'

// PORTFOLIO_OPS and FINANCE are legacy roles kept for backward compat with
// existing DB rows. They behave identically to ANALYST throughout the codebase.
export function isInternalRole(role: AppRole): boolean {
  return role === 'ANALYST' || role === 'PARTNER' || role === 'PORTFOLIO_OPS' || role === 'FINANCE'
}

// PARTNER is internal but read-only — they cannot mutate any data.
export function canWrite(role: AppRole): boolean {
  return role === 'ANALYST' || role === 'PORTFOLIO_OPS' || role === 'FINANCE'
}

// ── Get or create the current user record in DB ──────────────

export async function getCurrentUser() {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  // When Clerk is not configured the app runs in demo mode with no auth.
  if (!clerkKey) return null

  const { userId } = await auth()
  if (!userId) return null

  let user = await db.user.findUnique({ where: { clerkId: userId } })

  if (!user) {
    // First sign-in: pull data from Clerk and provision the DB record.
    // Role is seeded from Clerk publicMetadata so fund admins can pre-assign
    // roles (FOUNDER, LP) before the user ever signs in.
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)
    const email =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress ?? ''
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      email.split('@')[0] ||
      'Unknown'

    const roleFromMeta =
      (clerkUser.publicMetadata?.role as AppRole | undefined) ?? 'ANALYST'

    user = await db.user.create({
      data: { clerkId: userId, email, name, role: roleFromMeta, avatarUrl: clerkUser.imageUrl ?? null },
    })
  }

  return user
}

// ── Require a specific role (redirects on failure) ───────────

export async function requireInternalUser() {
  const user = await getCurrentUser()
  if (!user || !isInternalRole(user.role as AppRole)) {
    // Send non-internal roles to their own landing page rather than a bare 403.
    if (user?.role === 'FOUNDER') redirect('/founder/dashboard')
    if (user?.role === 'LP') redirect('/lp-reports')
    redirect('/sign-in')
  }
  return user
}

export async function requireWriteAccess() {
  const user = await requireInternalUser()
  if (!canWrite(user.role as AppRole)) {
    throw new Error('Read-only access: PARTNER role cannot perform write operations')
  }
  return user
}

export async function requireFounderAccess(companyId?: string) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'FOUNDER') redirect('/sign-in')
  // When companyId is provided, guard against horizontal privilege escalation
  // (a founder trying to read/write another company by guessing its ID).
  if (companyId && user.companyId !== companyId) {
    throw new Error('Forbidden: you can only access your own company data')
  }
  return user
}

export async function requireLPAccess(reportId?: string) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'LP') redirect('/sign-in')

  if (reportId) {
    const access = await db.lPReportAccess.findUnique({
      where: { userId_reportId: { userId: user.id, reportId } },
    })
    if (!access) throw new Error('Forbidden: you do not have access to this report')
  }

  return user
}

// ── Set role (admin use) — syncs DB + Clerk metadata ─────────

export async function setUserRole(targetUserId: string, role: AppRole) {
  const caller = await requireInternalUser()
  if (!canWrite(caller.role as AppRole)) {
    throw new Error('Only ANALYST users can manage roles')
  }

  await db.user.update({ where: { id: targetUserId }, data: { role } })

  // Clerk publicMetadata is the source the middleware reads for fast role-based
  // routing at the edge (where we can't hit Postgres). Keep it in sync so the
  // redirect behaviour matches the DB role immediately after a role change.
  const targetUser = await db.user.findUniqueOrThrow({ where: { id: targetUserId } })
  const client = await clerkClient()
  await client.users.updateUserMetadata(targetUser.clerkId, { publicMetadata: { role } })
}

// ── Grant LP access to a report ──────────────────────────────

export async function grantLPReportAccess(lpUserId: string, reportId: string) {
  await requireWriteAccess()
  // Upsert so the call is idempotent — safe to call multiple times.
  await db.lPReportAccess.upsert({
    where: { userId_reportId: { userId: lpUserId, reportId } },
    create: { userId: lpUserId, reportId },
    update: {},
  })
}

// ── Link a founder to their company ──────────────────────────

export async function linkFounderToCompany(founderUserId: string, companyId: string) {
  await requireWriteAccess()
  // Also enforces role = FOUNDER so a re-link doesn't accidentally leave the
  // user with an internal role while scoped to a single company.
  await db.user.update({
    where: { id: founderUserId },
    data: { companyId, role: 'FOUNDER' },
  })
}
