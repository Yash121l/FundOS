import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getFounderMORStatus } from '@/lib/founder'
import { FounderWeeklyForm } from '@/components/founder/founder-weekly-form'

export const dynamic = 'force-dynamic'

async function FounderWeeklyContent({ companyId }: { companyId: string }) {
  const { currentWeek, currentWeekPing } = await getFounderMORStatus(companyId)

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Weekly KPI Ping</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Async weekly check-in — 5 core metrics, takes ~2 minutes. Your PM reviews and flags anomalies.
        </p>
      </div>
      <FounderWeeklyForm
        week={currentWeek}
        alreadySubmitted={!!currentWeekPing}
      />
    </div>
  )
}

export default async function FounderWeeklyPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'FOUNDER' || !user.companyId) redirect('/sign-in')

  return (
    <Suspense fallback={<div className="p-5 text-[12px] text-muted-foreground animate-pulse">Loading…</div>}>
      <FounderWeeklyContent companyId={user.companyId} />
    </Suspense>
  )
}
