import { cookies } from 'next/headers'
import { db } from '@fundos/database'
import crypto from 'crypto'

export const SESSION_COOKIE = 'signalos_session'
const SESSION_DURATION_DAYS = 30

export type SessionUser = {
  id: string
  email: string
  name: string
  role: string
  avatarUrl: string | null
  companyId: string | null
}

function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ── Create a new session ──────────────────────────────────────

export async function createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
  const token = crypto.randomBytes(48).toString('hex')
  const tokenHash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)

  await db.session.create({
    data: { userId, token: tokenHash, expiresAt, userAgent: userAgent ?? null, ipAddress: ipAddress ?? null },
  })

  return token
}

// ── Set the session cookie ────────────────────────────────────

export async function setSessionCookie(token: string) {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: '/',
  })
}

// ── Get current session user ──────────────────────────────────

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  const tokenHash = hashSessionToken(token)

  const session = await db.session.findUnique({
    where: { token: tokenHash },
    include: {
      user: {
        select: { id: true, email: true, name: true, role: true, avatarUrl: true, companyId: true },
      },
    },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  return session.user
}

// ── Destroy session ───────────────────────────────────────────

export async function destroySession() {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.delete({ where: { token: hashSessionToken(token) } }).catch(() => {})
  }
  jar.delete(SESSION_COOKIE)
}

// ── Cleanup expired sessions (call from a cron job) ───────────

export async function purgeExpiredSessions() {
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
}
