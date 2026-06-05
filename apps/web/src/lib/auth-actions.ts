'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { db } from '@fundos/database'
import { createSession, setSessionCookie, destroySession, getSessionUser } from './session'
import { headers } from 'next/headers'
import type { AppRole } from './auth'

const WRITABLE_ROLES = new Set<AppRole>(['ANALYST', 'PORTFOLIO_OPS', 'FINANCE'])
const VALID_ROLES = new Set<AppRole>(['ANALYST', 'PARTNER', 'PORTFOLIO_OPS', 'FINANCE', 'FOUNDER', 'LP'])

function safeRedirectPath(value: FormDataEntryValue | null, role: string): string {
  const fallbackByRole: Record<string, string> = {
    FOUNDER: '/founder/dashboard',
    LP: '/lp-reports',
  }
  const fallback = fallbackByRole[role] ?? '/'
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback
  if (value.startsWith('/sign-in') || value.startsWith('/sign-up')) return fallback
  if (role === 'FOUNDER') return value.startsWith('/founder') ? value : fallback
  if (role === 'LP') return value.startsWith('/lp-reports') ? value : fallback
  if (value.startsWith('/founder')) return fallback
  return value
}

async function requireWritableSession() {
  const user = await getSessionUser()
  if (!user || !WRITABLE_ROLES.has(user.role as AppRole)) {
    throw new Error('Insufficient permissions.')
  }
  return user
}

// ── Sign In ───────────────────────────────────────────────────

export type SignInState = {
  error?: string
  redirectTo?: string
}

export async function signIn(
  _prev: SignInState | null,
  formData: FormData
): Promise<SignInState> {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase()
  const password = formData.get('password') as string | null

  if (!email || !password) return { error: 'Email and password are required.' }

  const user = await db.user.findUnique({ where: { email } })
  if (!user || !user.passwordHash) return { error: 'Invalid email or password.' }

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return { error: 'Invalid email or password.' }

  const hdrs = await headers()
  const token = await createSession(
    user.id,
    hdrs.get('user-agent') ?? undefined,
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined
  )
  await setSessionCookie(token)

  return { redirectTo: safeRedirectPath(formData.get('from'), user.role) }
}

// ── Sign Out ──────────────────────────────────────────────────

export async function signOut() {
  await destroySession()
  redirect('/sign-in')
}

// ── Invite / Create user (analyst use from Settings) ─────────

export interface InviteUserData {
  email: string
  name: string
  role: string
  password: string
  companyId?: string
}

export async function inviteUser(data: InviteUserData): Promise<{ success: boolean; error?: string }> {
  await requireWritableSession()
  if (!data.email || !data.name || !data.password) {
    return { success: false, error: 'Email, name and password are required.' }
  }
  if (data.password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' }
  }

  const role = data.role as AppRole
  if (!VALID_ROLES.has(role)) return { success: false, error: 'Invalid role.' }
  if (role === 'FOUNDER' && !data.companyId) {
    return { success: false, error: 'Founder users must be linked to a company.' }
  }

  const email = data.email.toLowerCase().trim()
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return { success: false, error: 'A user with this email already exists.' }

  const passwordHash = await bcrypt.hash(data.password, 12)

  await db.user.create({
    data: {
      email,
      name: data.name.trim(),
      passwordHash,
      role,
      companyId: role === 'FOUNDER' ? data.companyId : null,
      emailVerified: new Date(),
    },
  })

  return { success: true }
}

// ── Update user (role, company link, name) ────────────────────

export async function updateUser(
  userId: string,
  data: { name?: string; role?: string; companyId?: string | null }
): Promise<{ success: boolean; error?: string }> {
  const caller = await requireWritableSession()
  if (caller.id === userId && data.role && data.role !== caller.role) {
    return { success: false, error: 'You cannot change your own role.' }
  }

  const role = data.role as AppRole | undefined
  if (role && !VALID_ROLES.has(role)) return { success: false, error: 'Invalid role.' }
  if (role === 'FOUNDER' && !data.companyId) {
    return { success: false, error: 'Founder users must be linked to a company.' }
  }

  let companyId: string | null | undefined
  if (role === 'FOUNDER') {
    companyId = data.companyId
  } else if (role) {
    companyId = null
  } else {
    companyId = data.companyId !== undefined ? data.companyId : undefined
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { name: data.name ?? undefined, role, companyId },
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update user.' }
  }
}

// ── Delete user ───────────────────────────────────────────────

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const caller = await requireWritableSession()
  if (userId === 'SYSTEM') return { success: false, error: 'Cannot delete system user.' }
  if (caller.id === userId) return { success: false, error: 'You cannot delete your own account.' }
  try {
    await db.user.delete({ where: { id: userId } })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to delete user.' }
  }
}

// ── Change password ───────────────────────────────────────────

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const caller = await getSessionUser()
  if (!caller || caller.id !== userId) return { success: false, error: 'Insufficient permissions.' }
  if (newPassword.length < 8) return { success: false, error: 'New password must be at least 8 characters.' }

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user?.passwordHash) return { success: false, error: 'User not found.' }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) return { success: false, error: 'Current password is incorrect.' }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await db.user.update({ where: { id: userId }, data: { passwordHash } })
  return { success: true }
}

// ── Grant LP Report Access (server action wrapper) ─────────────

export async function grantLPAccess(
  lpUserId: string,
  reportId: string
): Promise<{ success: boolean; error?: string }> {
  await requireWritableSession()
  try {
    await db.lPReportAccess.upsert({
      where: { userId_reportId: { userId: lpUserId, reportId } },
      create: { userId: lpUserId, reportId },
      update: {},
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to grant access.' }
  }
}
