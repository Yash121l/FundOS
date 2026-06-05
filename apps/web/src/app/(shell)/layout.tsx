import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSessionUser } from '@/lib/session'
import { isInternalRole } from '@/lib/auth'
import type { AppRole } from '@/lib/auth'
import { Sidebar } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'
import { MobileSidebarProvider } from '@/components/shell/mobile-sidebar-context'
import { getSidebarBadges } from '@/lib/dashboard'

async function SidebarWithBadges() {
  const badges = await getSidebarBadges().catch(() => ({ updates: 0, trends: 0 }))
  return <Sidebar badges={badges} />
}

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const [user, hdrs] = await Promise.all([getSessionUser(), headers()])
  const pathname = hdrs.get('x-signalos-pathname') ?? ''

  if (!user) redirect('/sign-in')
  if (!isInternalRole(user.role as AppRole)) {
    if (user.role === 'FOUNDER') redirect('/founder/dashboard')
    if (user.role === 'LP') {
      if (!pathname.startsWith('/lp-reports')) redirect('/lp-reports')
      return (
        <div className="min-h-screen bg-background">
          <main>
            <Suspense fallback={<div className="p-5 text-[12px] text-muted-foreground animate-pulse">Loading…</div>}>
              {children}
            </Suspense>
          </main>
        </div>
      )
    }
    redirect('/sign-in')
  }

  return (
    <MobileSidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Suspense fallback={<Sidebar />}>
          <SidebarWithBadges />
        </Suspense>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar user={user} />
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={<div className="p-5 text-[12px] text-muted-foreground animate-pulse">Loading…</div>}>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </MobileSidebarProvider>
  )
}
