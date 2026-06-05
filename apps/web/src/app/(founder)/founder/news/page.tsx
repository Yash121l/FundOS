import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { FounderNewsForm } from '@/components/founder/founder-news-form'

export const dynamic = 'force-dynamic'

export default async function FounderNewsPage() {
  

  const user = await getCurrentUser()
  if (!user || user.role !== 'FOUNDER' || !user.companyId) redirect('/sign-in')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Share News</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Let your investors know about wins, milestones, and important signals.
        </p>
      </div>
      <FounderNewsForm />
    </div>
  )
}
