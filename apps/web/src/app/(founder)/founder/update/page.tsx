import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getFounderFiledPeriods, getFounderKPIs } from '@/lib/founder'
import { FounderUpdateForm } from '@/components/founder/founder-update-form'

export const dynamic = 'force-dynamic'

export default async function FounderUpdatePage() {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  if (!clerkKey) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Authentication is not configured.
      </div>
    )
  }

  const user = await getCurrentUser()
  if (!user || user.role !== 'FOUNDER' || !user.companyId) redirect('/sign-in')

  const [filedPeriods, kpis] = await Promise.all([
    getFounderFiledPeriods(user.companyId),
    getFounderKPIs(user.companyId),
  ])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Submit Monthly Update</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Share your metrics and narrative with your investors.
        </p>
      </div>
      <FounderUpdateForm filedPeriods={filedPeriods} prevMetrics={kpis.current} />
    </div>
  )
}
