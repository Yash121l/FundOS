import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getFounderCompany, getFounderKPIs } from '@/lib/founder'
import { FounderDashboard } from '@/components/founder/founder-dashboard'

export const dynamic = 'force-dynamic'

export default async function FounderDashboardPage() {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  if (!clerkKey) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Authentication is not configured. Add Clerk environment variables to enable the founder portal.
      </div>
    )
  }

  const user = await getCurrentUser()
  if (!user || user.role !== 'FOUNDER' || !user.companyId) redirect('/sign-in')

  const [company, kpis] = await Promise.all([
    getFounderCompany(user.companyId),
    getFounderKPIs(user.companyId),
  ])

  if (!company) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Company data not found. Contact your fund&apos;s platform team.
      </div>
    )
  }

  return <FounderDashboard company={company} kpis={kpis} userName={user.name} />
}
