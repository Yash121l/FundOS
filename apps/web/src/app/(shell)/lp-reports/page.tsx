import { Suspense } from 'react'
import { getLPReports, getLPReportsForUser } from '@/lib/lp-reports'
import { getLPManagementData } from '@/lib/lp-management-actions'
import { getSessionUser } from '@/lib/session'
import { isInternalRole, type AppRole } from '@/lib/auth'
import { LPReportsWithManagement } from '@/components/lp-reports/lp-reports-with-management'

export const dynamic = 'force-dynamic'

async function LPReportsContent() {
  const user = await getSessionUser()
  const canManageLPs = !!user && isInternalRole(user.role as AppRole)
  const [reports, lpData] = await Promise.all([
    canManageLPs
      ? getLPReports().catch(() => [])
      : user?.role === 'LP'
        ? getLPReportsForUser(user.id).catch(() => [])
        : Promise.resolve([]),
    canManageLPs
      ? getLPManagementData().catch(() => ({
          lpEntities: [],
          capitalCalls: [],
          distributions: [],
          lpacMeetings: [],
          fundProfile: null,
        }))
      : Promise.resolve({
          lpEntities: [],
          capitalCalls: [],
          distributions: [],
          lpacMeetings: [],
          fundProfile: null,
        }),
  ])

  return <LPReportsWithManagement reports={reports} lpData={lpData} canManageLPs={canManageLPs} />
}

export default function LPReportsPage() {
  return (
    <Suspense fallback={<div className="p-5 text-[12px] text-muted-foreground animate-pulse">Loading…</div>}>
      <LPReportsContent />
    </Suspense>
  )
}
