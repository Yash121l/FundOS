import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getFounderMORStatus } from '@/lib/founder'
import { FounderMORForm } from '@/components/founder/founder-mor-form'

export const dynamic = 'force-dynamic'

async function FounderMORContent({ companyId }: { companyId: string }) {
  const morStatus = await getFounderMORStatus(companyId)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Monthly Operations Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your {morStatus.reportingPeriod} MOR — structured data your investors use for portfolio monitoring and IC reviews.
        </p>
      </div>
      <FounderMORForm
        reportingPeriod={morStatus.reportingPeriod}
        dueDate={morStatus.dueDate}
        daysUntilDue={morStatus.daysUntilDue}
        isOverdue={morStatus.isOverdue}
        isSubmitted={morStatus.isSubmitted}
      />
    </div>
  )
}

export default async function FounderUpdatePage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'FOUNDER' || !user.companyId) redirect('/sign-in')

  return (
    <Suspense fallback={<div className="p-5 text-[12px] text-muted-foreground animate-pulse">Loading report…</div>}>
      <FounderMORContent companyId={user.companyId} />
    </Suspense>
  )
}
