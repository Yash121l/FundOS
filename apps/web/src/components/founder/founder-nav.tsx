'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, TrendingUp, Newspaper } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/founder/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/founder/update', label: 'Monthly MOR', icon: FileText },
  { href: '/founder/weekly', label: 'Weekly KPI', icon: TrendingUp },
  { href: '/founder/news', label: 'Share News', icon: Newspaper },
]

export function FounderNav() {
  const path = usePathname()

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-primary flex-shrink-0" />
          <span className="font-semibold text-[13px]">SignalOS</span>
          <span className="text-muted-foreground/40 mx-1 text-xs">·</span>
          <span className="text-[12px] text-muted-foreground">Founder</span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = path.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] transition-colors',
                  isActive
                    ? 'bg-secondary text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                )}
              >
                <Icon size={13} className="flex-shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
