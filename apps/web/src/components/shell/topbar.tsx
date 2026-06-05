'use client'

import { useTransition, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Search, LogOut, Settings, Menu } from 'lucide-react'
import Link from 'next/link'
import { useCommandPalette } from '@/components/providers/command-palette-provider'
import { useMobileSidebar } from './mobile-sidebar-context'
import { signOut } from '@/lib/auth-actions'
import type { SessionUser } from '@/lib/session'


const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/portfolio': 'Portfolio',
  '/updates': 'Updates',
  '/updates/new': 'Submit Update',
  '/trends': 'Trends',
  '/intelligence': 'Market Intelligence',
  '/lp-reports': 'LP Reports',
  '/fund': 'Fund Performance',
  '/ask': 'Ask',
  '/settings': 'Settings',
}

function getTitle(path: string): string {
  if (TITLES[path]) return TITLES[path]!
  if (path.startsWith('/portfolio/')) return 'Company Detail'
  if (path.startsWith('/lp-reports/')) return 'Report'
  if (path.startsWith('/settings')) return 'Settings'
  return 'SignalOS'
}

function UserMenu({ user }: { user: SessionUser }) {
  const [pending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen((v) => !v)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  function handleBlur(e: React.FocusEvent) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2 h-7 px-2 rounded-md hover:bg-secondary/70 transition-colors"
      >
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary flex-shrink-0">
          {initials}
        </div>
        <span className="hidden sm:block text-[12px] font-medium text-foreground truncate max-w-[120px]">
          {user.name}
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-50 w-52 max-w-[calc(100vw-1rem)] rounded-xl border border-border bg-card shadow-lg py-1"
        >
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-[12px] font-medium truncate">{user.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wider bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
              {user.role}
            </span>
          </div>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <Settings size={13} />
            Settings
          </Link>
          <button
            role="menuitem"
            onClick={() => startTransition(async () => { await signOut() })}
            disabled={pending}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <LogOut size={13} />
            {pending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}

interface TopbarProps {
  user?: SessionUser | null
}

export function Topbar({ user }: TopbarProps) {
  const path = usePathname()
  const { open } = useCommandPalette()
  const { open: openSidebar } = useMobileSidebar()
  const title = getTitle(path)

  return (
    <header className="h-14 flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm flex items-center px-4 sm:px-5 gap-3 sm:gap-4 sticky top-0 z-10">
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

      {user && <UserMenu user={user} />}
    </header>
  )
}
