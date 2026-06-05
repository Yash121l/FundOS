import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { FounderNav } from '@/components/founder/founder-nav'

export default async function FounderLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')
  if (user.role !== 'FOUNDER') redirect('/')

  if (!user.companyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-4">
          <div className="h-10 w-10 rounded-md bg-primary mx-auto mb-4" />
          <h1 className="text-lg font-semibold mb-2">Account setup in progress</h1>
          <p className="text-sm text-muted-foreground">
            Your account hasn&apos;t been linked to a portfolio company yet. Please contact your fund&apos;s platform team.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <FounderNav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
