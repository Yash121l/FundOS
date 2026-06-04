import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { Sidebar } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'
import { getSidebarBadges } from '@/lib/dashboard'

async function SidebarWithBadges() {
  const badges = await getSidebarBadges().catch(() => ({ updates: 0, trends: 0 }))
  return <Sidebar badges={badges} />
}

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  // Belt-and-suspenders auth guard. Middleware handles the redirect at the edge,
  // but this catches any request that slips through (cache, cold start, etc.).
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Suspense fallback={<Sidebar />}>
        <SidebarWithBadges />
      </Suspense>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
