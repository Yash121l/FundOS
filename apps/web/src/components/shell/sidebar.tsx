'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Inbox,
  TrendingUp,
  Globe,
  FileBarChart,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMobileSidebar } from './mobile-sidebar-context'

const NAV = [
  {
    group: 'OVERVIEW',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
      { icon: Building2, label: 'Portfolio', href: '/portfolio' },
      { icon: Inbox, label: 'Updates', href: '/updates', badgeKey: 'updates' as const },
    ],
  },
  {
    group: 'INTELLIGENCE',
    items: [
      { icon: TrendingUp, label: 'Trends', href: '/trends', badgeKey: 'trends' as const },
      { icon: Globe, label: 'Market Intel', href: '/intelligence' },
      { icon: Sparkles, label: 'Ask', href: '/ask' },
    ],
  },
  {
    group: 'REPORTING',
    items: [{ icon: FileBarChart, label: 'LP Reports', href: '/lp-reports' }],
  },
]

interface SidebarProps {
  badges?: { updates?: number; trends?: number }
}

export function Sidebar({ badges }: SidebarProps) {
  const path = usePathname()
  const { isOpen, close } = useMobileSidebar()

  // Close sidebar on route change (for mobile tap-nav); `close` ref is stable
  useEffect(() => { close() }, [path, close])

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside
        className={cn(
          'w-[232px] flex-shrink-0 border-r border-border bg-card flex flex-col overflow-hidden',
          'transition-transform duration-200 ease-in-out',
          // Mobile: fixed overlay sliding in from left
          'fixed inset-y-0 left-0 z-40',
          // Desktop: back to sticky in-flow layout
          'md:sticky md:top-0 md:h-screen',
          // Translation: hidden on mobile unless open, always visible on desktop
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border flex-shrink-0">
          <div className="h-[22px] w-[22px] rounded-md bg-primary mr-2.5 flex-shrink-0" />
          <span className="font-semibold text-[13px] tracking-tight">SignalOS</span>
          {/* RTP label — desktop only */}
          <span className="ml-auto text-[10px] text-muted-foreground/50 font-medium uppercase tracking-widest hidden md:block">
            RTP
          </span>
          {/* Close button — mobile only */}
          <button
            onClick={close}
            aria-label="Close menu"
            className="ml-auto md:hidden h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 pt-3 pb-2 overflow-y-auto space-y-4">
          {NAV.map(({ group, items }) => (
            <div key={group}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 select-none">
                {group}
              </p>
              <ul className="space-y-px">
                {items.map(({ icon: Icon, label, href, badgeKey }) => {
                  const isActive = href === '/' ? path === '/' : path.startsWith(href)
                  const count = badgeKey ? badges?.[badgeKey] : undefined

                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'group flex items-center gap-2 h-[30px] px-2 rounded-md text-[13px] transition-colors',
                          isActive
                            ? 'bg-secondary text-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                        )}
                      >
                        <Icon
                          size={14}
                          className={cn(
                            'flex-shrink-0 transition-colors',
                            isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                          )}
                        />
                        <span className="flex-1 truncate">{label}</span>
                        {count != null && count > 0 && (
                          <span className="text-[10px] tabular-nums font-semibold bg-primary/15 text-primary px-1.5 py-px rounded-full min-w-[18px] text-center leading-4">
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-2 py-2 flex-shrink-0">
          <Link
            href="/settings"
            className="flex items-center gap-2 h-[30px] px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
          >
            <Settings size={14} className="flex-shrink-0" />
            <span>Settings</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
