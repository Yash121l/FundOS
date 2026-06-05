'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, Trash2, Edit3, Link, X, Check } from 'lucide-react'
import { inviteUser, updateUser, deleteUser, grantLPAccess, type InviteUserData } from '@/lib/auth-actions'
import { formatDate } from '@fundos/shared'
import type { SessionUser } from '@/lib/session'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  ANALYST: 'Analyst', PARTNER: 'Partner', FOUNDER: 'Founder', LP: 'LP',
  PORTFOLIO_OPS: 'Portfolio Ops', FINANCE: 'Finance',
}
const ROLE_COLORS: Record<string, string> = {
  ANALYST: 'bg-blue-500/10 text-blue-400',
  PARTNER: 'bg-purple-500/10 text-purple-400',
  FOUNDER: 'bg-green-500/10 text-green-400',
  LP: 'bg-amber-500/10 text-amber-400',
  PORTFOLIO_OPS: 'bg-blue-500/10 text-blue-400',
  FINANCE: 'bg-blue-500/10 text-blue-400',
}

interface UserRow {
  id: string; email: string; name: string; role: string
  avatarUrl: string | null; companyId: string | null; emailVerified: Date | null; createdAt: Date
  company: { id: string; name: string; slug: string } | null
}
interface Company { id: string; name: string; slug: string; sector: string; stage: string }
interface LPReport { id: string; title: string; quarter: string }

interface Props {
  me: SessionUser
  users: UserRow[]
  companies: Company[]
  lpReports: LPReport[]
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

// ── Invite User Modal ──────────────────────────────────────────

function InviteModal({ companies, onClose }: { companies: Company[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [form, setForm] = useState<InviteUserData>({
    email: '', name: '', role: 'ANALYST', password: '', companyId: '',
  })

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  function s<K extends keyof InviteUserData>(k: K, v: InviteUserData[K]) {
    setForm((f) => ({ ...f, [k]: v }))
    setError('')
  }

  function handleSubmit() {
    if (!form.email || !form.name || !form.password) { setError('All required fields must be filled.'); return }
    startTransition(async () => {
      const res = await inviteUser({ ...form, companyId: form.companyId || undefined })
      if (!res.success) { setError(res.error ?? 'Failed'); return }
      setSuccess('User created successfully.')
      timerRef.current = setTimeout(onClose, 1200)
    })
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-background border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Dialog.Title className="text-[14px] font-semibold">Invite User</Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close dialog" className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button>
            </Dialog.Close>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name *">
                <input type="text" value={form.name} onChange={(e) => s('name', e.target.value)} className="input w-full" placeholder="Jane Smith" />
              </Field>
              <Field label="Email *">
                <input type="email" value={form.email} onChange={(e) => s('email', e.target.value)} className="input w-full" placeholder="jane@fund.vc" />
              </Field>
              <Field label="Role">
                <select value={form.role} onChange={(e) => s('role', e.target.value)} className="input w-full">
                  <option value="ANALYST">Analyst</option>
                  <option value="PARTNER">Partner (read-only)</option>
                  <option value="FOUNDER">Founder</option>
                  <option value="LP">LP</option>
                </select>
              </Field>
              <Field label="Temp Password *">
                <input type="password" value={form.password} onChange={(e) => s('password', e.target.value)} className="input w-full" placeholder="Min 8 characters" />
              </Field>
            </div>
            {(form.role === 'FOUNDER') && (
              <Field label="Portfolio Company (for Founders)">
                <select value={form.companyId} onChange={(e) => s('companyId', e.target.value)} className="input w-full">
                  <option value="">— not linked yet —</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            {success && <p className="text-[12px] text-emerald-400">✓ {success}</p>}
          </div>
          <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">Cancel</button>
            </Dialog.Close>
            <button onClick={handleSubmit} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}>
              {pending ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Edit User Row ─────────────────────────────────────────────

function EditUserRow({ user, companies, lpReports, onDone }: {
  user: UserRow; companies: Company[]; lpReports: LPReport[]; onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [role, setRole] = useState(user.role)
  const [companyId, setCompanyId] = useState(user.companyId ?? '')
  const [reportId, setReportId] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    startTransition(async () => {
      const res = await updateUser(user.id, {
        role,
        companyId: role === 'FOUNDER' ? (companyId || null) : null,
      })
      if (!res.success) { setError(res.error ?? 'Failed'); return }
      if (role === 'LP' && reportId) {
        const grantRes = await grantLPAccess(user.id, reportId)
        if (!grantRes.success) {
          setError((grantRes as { success: false; error?: string }).error ?? 'Failed to grant LP access.')
          return
        }
      }
      onDone()
    })
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-secondary/10 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="input w-full h-8 text-[12px]">
            <option value="ANALYST">Analyst</option>
            <option value="PARTNER">Partner (read-only)</option>
            <option value="FOUNDER">Founder</option>
            <option value="LP">LP</option>
          </select>
        </div>
        {role === 'FOUNDER' && (
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Portfolio Company</label>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="input w-full h-8 text-[12px]">
              <option value="">— not linked —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        {role === 'LP' && lpReports.length > 0 && (
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Grant Report Access</label>
            <select value={reportId} onChange={(e) => setReportId(e.target.value)} className="input w-full h-8 text-[12px]">
              <option value="">— choose report —</option>
              {lpReports.map((r) => <option key={r.id} value={r.id}>{r.quarter} · {r.title}</option>)}
            </select>
          </div>
        )}
      </div>
      {error && <p className="text-[12px] text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={pending} className={cn('flex items-center gap-1 h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}>
          <Check size={11} /> {pending ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onDone} className="h-7 px-3 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-secondary">Cancel</button>
      </div>
    </div>
  )
}

// ── Main Users Tab ────────────────────────────────────────────

export function UsersTab({ me, users, companies, lpReports }: Props) {
  const [showInvite, setShowInvite] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [filter, setFilter] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteName, setConfirmDeleteName] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(filter.toLowerCase()) ||
    u.email.toLowerCase().includes(filter.toLowerCase()) ||
    u.role.toLowerCase().includes(filter.toLowerCase())
  )

  function handleDelete(userId: string, name: string) {
    if (userId === me.id) { setDeleteError('You cannot delete your own account.'); return }
    setConfirmDeleteId(userId)
    setConfirmDeleteName(name)
  }

  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    setDeleteError('')
    startTransition(async () => {
      try {
        const response = await deleteUser(id)
        if (!response.success) {
          setDeleteError(response.error ?? 'Failed to delete user.')
        }
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'Failed to delete user.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-[15px] font-semibold">Users & Access</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Invite analysts, founders, and LPs. Manage roles and report access.</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={13} /> Invite User
        </button>
      </div>

      {deleteError && <p className="text-[12px] text-red-400">{deleteError}</p>}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-background border border-border rounded-xl shadow-2xl p-5 space-y-4">
            <p className="text-[14px] font-semibold">Delete user "{confirmDeleteName}"?</p>
            <p className="text-[12px] text-muted-foreground">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmDeleteId(null)} className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">Cancel</button>
              <button type="button" onClick={confirmDelete} className="h-8 px-4 rounded-lg bg-red-600 text-white text-[12px] font-medium hover:bg-red-500">Delete</button>
            </div>
          </div>
        </>
      )}

      {/* Search filter */}
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by name, email, or role…"
        className="input w-full max-w-sm h-8 text-[12px]"
      />

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {(['ANALYST', 'PARTNER', 'FOUNDER', 'LP'] as const).map((role) => {
          const count = users.filter((u) => u.role === role).length
          return (
            <div key={role} className={cn('rounded-lg border border-border px-3 py-2', ROLE_COLORS[role]?.replace('text-', 'border-').split(' ')[0])}>
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{ROLE_LABELS[role]}</p>
              <p className="text-[20px] font-bold">{count}</p>
            </div>
          )
        })}
      </div>

      {/* User list */}
      <div className="space-y-2">
        {filtered.map((user) => (
          <div key={user.id}>
            {editingId === user.id ? (
              <EditUserRow user={user} companies={companies} lpReports={lpReports} onDone={() => setEditingId(null)} />
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-secondary/20 transition-colors">
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-[11px] font-semibold text-muted-foreground flex-shrink-0">
                  {user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium">{user.name}</span>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', ROLE_COLORS[user.role] ?? 'bg-secondary text-muted-foreground')}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                    {!user.emailVerified && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Unverified</span>
                    )}
                    {user.id === me.id && (
                      <span className="text-[10px] text-muted-foreground/50">(you)</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{user.email}</p>
                  {user.company && (
                    <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
                      <Link size={10} />
                      Linked to {user.company.name}
                    </p>
                  )}
                </div>

                {/* Joined date */}
                <p className="hidden sm:block text-[11px] text-muted-foreground whitespace-nowrap">
                  {formatDate(user.createdAt)}
                </p>

                {/* Actions */}
                {user.id !== 'SYSTEM' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingId(user.id)}
                      title="Edit user"
                      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      title="Delete user"
                      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-[13px] text-muted-foreground">No users match your filter.</div>
        )}
      </div>

      {showInvite && <InviteModal companies={companies} onClose={() => setShowInvite(false)} />}
    </div>
  )
}
