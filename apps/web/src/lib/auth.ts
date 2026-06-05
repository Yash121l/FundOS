import { db } from '@fundos/database'
import { redirect } from 'next/navigation'
import { getSessionUser } from './session'

// ── Role helpers ─────────────────────────────────────────────

export type AppRole = 'ANALYST' | 'PARTNER' | 'PORTFOLIO_OPS' | 'FINANCE' | 'FOUNDER' | 'LP'

export function isInternalRole(role: AppRole): boolean {
  return role === 'ANALYST' || role === 'PARTNER' || role === 'PORTFOLIO_OPS' || role === 'FINANCE'
}

export function canWrite(role: AppRole): boolean {
  return role === 'ANALYST' || role === 'PORTFOLIO_OPS' || role === 'FINANCE'
}

// ── Get current user from session ────────────────────────────

export async function getCurrentUser() {
  return getSessionUser()
}

// ── Require specific roles ────────────────────────────────────

export async function requireInternalUser() {
  const user = await getCurrentUser()
  if (!user || !isInternalRole(user.role as AppRole)) {
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

// ── User management (settings) ────────────────────────────────

export async function setUserRole(targetUserId: string, role: AppRole) {
  const caller = await requireWriteAccess()
  if (caller.id === targetUserId) throw new Error('Cannot change your own role')
  await db.user.update({ where: { id: targetUserId }, data: { role } })
}

export async function grantLPReportAccess(lpUserId: string, reportId: string) {
  await requireWriteAccess()
  await db.lPReportAccess.upsert({
    where: { userId_reportId: { userId: lpUserId, reportId } },
    create: { userId: lpUserId, reportId },
    update: {},
  })
}

export async function linkFounderToCompany(founderUserId: string, companyId: string) {
  await requireWriteAccess()
  await db.user.update({
    where: { id: founderUserId },
    data: { companyId, role: 'FOUNDER' },
  })
}
