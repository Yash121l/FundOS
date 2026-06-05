import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getFounderCompany, getFounderKPIs, getFounderMORStatus } from '@/lib/founder'
import { FounderDashboard } from '@/components/founder/founder-dashboard'

export const dynamic = 'force-dynamic'

async function FounderDashboardContent({ userId, companyId }: { userId: string; companyId: string }) {
  const [company, kpis, morStatus] = await Promise.all([
    getFounderCompany(companyId),
    getFounderKPIs(companyId),
    getFounderMORStatus(companyId),
  ])

  if (!company) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Company data not found. Contact your fund&apos;s platform team.
      </div>
    )
  }

  return <FounderDashboard company={company} kpis={kpis} userName={userId} morStatus={morStatus} />
}

export default async function FounderDashboardPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'FOUNDER' || !user.companyId) redirect('/sign-in')

  return (
    <Suspense fallback={<div className="p-5 text-[12px] text-muted-foreground animate-pulse">Loading dashboard…</div>}>
      <FounderDashboardContent userId={user.name} companyId={user.companyId} />
    </Suspense>
  )
}
