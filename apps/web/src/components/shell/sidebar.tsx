'use client'

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
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

  return (
    <aside className="w-[232px] flex-shrink-0 border-r border-border bg-card flex flex-col h-screen sticky top-0 overflow-hidden">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border flex-shrink-0">
        <div className="h-[22px] w-[22px] rounded-md bg-primary mr-2.5 flex-shrink-0" />
        <span className="font-semibold text-[13px] tracking-tight">SignalOS</span>
        <span className="ml-auto text-[10px] text-muted-foreground/50 font-medium uppercase tracking-widest">
          RTP
        </span>
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
  )
}
