import { Sidebar } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'
import { getSidebarBadges } from '@/lib/dashboard'

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  // Best-effort: if DB isn't connected (e.g., build time), fall back to zero counts
  const badges = await getSidebarBadges().catch(() => ({ updates: 0, trends: 0 }))

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar badges={badges} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
