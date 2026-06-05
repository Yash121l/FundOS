import { getSessionUser } from '@/lib/session'
import { redirect } from 'next/navigation'
import { canWrite } from '@/lib/auth'
import type { AppRole } from '@/lib/auth'
import { db } from '@fundos/database'
import { SettingsShell } from '@/components/settings/settings-shell'

export const dynamic = 'force-dynamic'

async function getData() {
  const [users, companies, lpReports, fund] = await Promise.all([
    db.user.findMany({
      where: { NOT: { id: 'SYSTEM' } },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: {
        id: true, email: true, name: true, role: true,
        avatarUrl: true, companyId: true, emailVerified: true, createdAt: true,
        company: { select: { id: true, name: true, slug: true } },
      },
    }),
    db.company.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, sector: true, stage: true },
    }),
    db.lPReport.findMany({
      where: { status: 'READY' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, quarter: true },
    }),
    db.fundProfile.findFirst(),
  ])

  return { users, companies, lpReports, fund }
}

export default async function SettingsPage() {
  const me = await getSessionUser()
  if (!me) redirect('/sign-in')

  const isWriter = canWrite(me.role as AppRole)
  const { users, companies, lpReports, fund } = await getData()

  return (
    <div className="p-5 max-w-5xl space-y-1">
      <SettingsShell
        me={me}
        isWriter={isWriter}
        users={users}
        companies={companies}
        lpReports={lpReports}
        fund={fund}
      />
    </div>
  )
}
