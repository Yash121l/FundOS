'use client'

import { lazy, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { Search, User, Menu } from 'lucide-react'
import { useCommandPalette } from '@/components/providers/command-palette-provider'
import { useMobileSidebar } from './mobile-sidebar-context'

const ClerkUserButton = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? lazy(() => import('@clerk/nextjs').then((m) => ({ default: m.UserButton })))
  : null

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/portfolio': 'Portfolio',
  '/updates': 'Updates',
  '/updates/new': 'Submit Update',
  '/trends': 'Trends',
  '/intelligence': 'Market Intelligence',
  '/lp-reports': 'LP Reports',
  '/settings': 'Settings',
}

function getTitle(path: string): string {
  if (TITLES[path]) return TITLES[path]!
  if (path.startsWith('/portfolio/')) return 'Company Detail'
  if (path.startsWith('/lp-reports/')) return 'Report'
  return 'SignalOS'
}

export function Topbar() {
  const path = usePathname()
  const { open } = useCommandPalette()
  const { open: openSidebar } = useMobileSidebar()
  const title = getTitle(path)

  return (
    <header className="h-14 flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm flex items-center px-4 sm:px-5 gap-3 sm:gap-4 sticky top-0 z-10">
      {/* Hamburger — mobile only */}
      <button
        onClick={openSidebar}
        aria-label="Open menu"
        className="md:hidden h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors flex-shrink-0"
      >
        <Menu size={16} />
      </button>

      <h1 className="text-[13px] font-medium text-foreground flex-1 truncate">{title}</h1>

      <button
        onClick={open}
        aria-label="Open search"
        className="flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-secondary/60 transition-colors text-[12px]"
      >
        <Search size={13} />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline ml-1.5 text-[10px] font-mono bg-secondary px-1.5 py-px rounded text-muted-foreground/70">
          ⌘K
        </kbd>
      </button>

      <div className="flex-shrink-0">
        {ClerkUserButton ? (
          <Suspense fallback={<div className="h-7 w-7 rounded-full bg-secondary border border-border" />}>
            <ClerkUserButton appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
          </Suspense>
        ) : (
          <div className="h-7 w-7 rounded-full bg-secondary border border-border flex items-center justify-center">
            <User size={13} className="text-muted-foreground" />
          </div>
        )}
      </div>
    </header>
  )
}
