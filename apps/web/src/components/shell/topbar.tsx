'use client'

import { usePathname } from 'next/navigation'
import { Search, User } from 'lucide-react'
import { useCommandPalette } from '@/components/providers/command-palette-provider'

// Lazy-loaded only when Clerk key is present
let ClerkUserButton: React.ComponentType<{ appearance?: object }> | null = null
if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ClerkUserButton = require('@clerk/nextjs').UserButton
}

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
  return 'FundOS'
}

export function Topbar() {
  const path = usePathname()
  const { open } = useCommandPalette()
  const title = getTitle(path)

  return (
    <header className="h-14 flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm flex items-center px-5 gap-4 sticky top-0 z-10">
      <h1 className="text-[13px] font-medium text-foreground flex-1">{title}</h1>

      <button
        onClick={open}
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
          <ClerkUserButton appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
        ) : (
          <div className="h-7 w-7 rounded-full bg-secondary border border-border flex items-center justify-center">
            <User size={13} className="text-muted-foreground" />
          </div>
        )}
      </div>
    </header>
  )
}
