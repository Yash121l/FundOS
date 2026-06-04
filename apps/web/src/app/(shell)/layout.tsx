import { Suspense } from 'react'
import { Sidebar } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'
import { getSidebarBadges } from '@/lib/dashboard'

async function SidebarWithBadges() {
  const badges = await getSidebarBadges().catch(() => ({ updates: 0, trends: 0 }))
  return <Sidebar badges={badges} />
}

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
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
