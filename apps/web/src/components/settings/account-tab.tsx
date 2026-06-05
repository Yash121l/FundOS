'use client'

import { useState, useTransition } from 'react'
import { changePassword, signOut } from '@/lib/auth-actions'
import type { SessionUser } from '@/lib/session'
import { cn } from '@/lib/utils'

interface Props {
  me: SessionUser
}

const ROLE_LABELS: Record<string, string> = {
  ANALYST: 'Analyst', PARTNER: 'Partner', FOUNDER: 'Founder',
  LP: 'LP', PORTFOLIO_OPS: 'Portfolio Ops', FINANCE: 'Finance',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

export function AccountTab({ me }: Props) {
  const [pending, startTransition] = useTransition()
  const [signOutPending, startSignOut] = useTransition()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function s(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    setError('')
    setSuccess('')
  }

  function handleChangePassword() {
    if (!form.current || !form.next) { setError('All fields are required.'); return }
    if (form.next !== form.confirm) { setError('New passwords do not match.'); return }
    if (form.next.length < 8) { setError('New password must be at least 8 characters.'); return }
    startTransition(async () => {
      const res = await changePassword(me.id, form.current, form.next)
      if (!res.success) { setError(res.error ?? 'Failed.'); return }
      setSuccess('Password updated successfully.')
      setForm({ current: '', next: '', confirm: '' })
    })
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h2 className="text-[15px] font-semibold">Account</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Your profile and security settings.</p>
      </div>

      {/* Profile info */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="flex items-center gap-4 px-4 py-4">
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-[13px] font-semibold text-muted-foreground flex-shrink-0">
            {(me.name?.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()) || me.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-[14px] font-semibold">{me.name}</p>
            <p className="text-[12px] text-muted-foreground">{me.email}</p>
          </div>
          <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded bg-secondary text-muted-foreground">
            {ROLE_LABELS[me.role] ?? me.role}
          </span>
        </div>
      </div>

      {/* Change password */}
      <div className="space-y-4">
        <h3 className="text-[13px] font-semibold">Change Password</h3>
        <div className="space-y-3">
          <Field label="Current Password">
            <input
              type="password"
              value={form.current}
              onChange={(e) => s('current', e.target.value)}
              autoComplete="current-password"
              className="input w-full"
            />
          </Field>
          <Field label="New Password">
            <input
              type="password"
              value={form.next}
              onChange={(e) => s('next', e.target.value)}
              autoComplete="new-password"
              placeholder="Min 8 characters"
              className="input w-full"
            />
          </Field>
          <Field label="Confirm New Password">
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => s('confirm', e.target.value)}
              autoComplete="new-password"
              className="input w-full"
            />
          </Field>
        </div>

        {error && <p className="text-[12px] text-red-400">{error}</p>}
        {success && <p className="text-[12px] text-emerald-400">✓ {success}</p>}

        <button
          onClick={handleChangePassword}
          disabled={pending}
          className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}
        >
          {pending ? 'Updating…' : 'Update Password'}
        </button>
      </div>

      {/* Sign out */}
      <div className="pt-4 border-t border-border">
        <h3 className="text-[13px] font-semibold mb-2">Session</h3>
        <p className="text-[12px] text-muted-foreground mb-3">
          Sign out of this device. Your session will be invalidated immediately.
        </p>
        <button
          onClick={() => startSignOut(async () => { await signOut() })}
          disabled={signOutPending}
          className="h-8 px-4 rounded-lg border border-red-500/30 text-red-400 text-[12px] font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          {signOutPending ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>
    </div>
  )
}
