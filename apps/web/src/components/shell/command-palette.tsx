'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { Command } from 'cmdk'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Building2,
  Inbox,
  TrendingUp,
  Globe,
  FileBarChart,
  Search,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  name: string
  slug: string
  sector: string
  healthStatus: 'HEALTHY' | 'WATCHLIST' | 'AT_RISK'
}

const HEALTH_DOT: Record<string, string> = {
  HEALTHY: 'bg-emerald-500',
  WATCHLIST: 'bg-amber-500',
  AT_RISK: 'bg-red-500',
}

const NAV_SHORTCUTS = [
  { icon: LayoutDashboard, label: 'Go to Dashboard', href: '/' },
  { icon: Building2, label: 'Go to Portfolio', href: '/portfolio' },
  { icon: Inbox, label: 'Go to Updates', href: '/updates' },
  { icon: TrendingUp, label: 'Go to Trends', href: '/trends' },
  { icon: Globe, label: 'Go to Market Intelligence', href: '/intelligence' },
  { icon: FileBarChart, label: 'Go to LP Reports', href: '/lp-reports' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter()

  // Global ⌘K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-[20vh] z-50 w-full max-w-[540px] -translate-x-1/2 rounded-xl border border-border bg-popover shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <PaletteContent onClose={() => onOpenChange(false)} router={router} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function PaletteContent({
  onClose,
  router,
}: {
  onClose: () => void
  router: ReturnType<typeof useRouter>
}) {
  const navigate = useCallback(
    (href: string) => {
      router.push(href)
      onClose()
    },
    [router, onClose]
  )

  return (
    <Command className="flex flex-col" shouldFilter>
      <div className="flex items-center gap-3 px-4 border-b border-border">
        <Search size={14} className="text-muted-foreground flex-shrink-0" />
        <Command.Input
          className="flex-1 h-12 bg-transparent text-[13px] placeholder:text-muted-foreground outline-none"
          placeholder="Search companies, navigate..."
          autoFocus
        />
        <kbd className="text-[10px] font-mono text-muted-foreground/50 border border-border rounded px-1.5 py-px">
          ESC
        </kbd>
      </div>

      <Command.List className="max-h-[340px] overflow-y-auto py-1.5">
        <Command.Empty className="px-4 py-8 text-center text-[13px] text-muted-foreground">
          No results found.
        </Command.Empty>

        {/* Navigation */}
        <Command.Group
          heading={
            <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none block">
              Navigate
            </span>
          }
        >
          {NAV_SHORTCUTS.map(({ icon: Icon, label, href }) => (
            <Command.Item
              key={href}
              value={label}
              onSelect={() => navigate(href)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-md cursor-pointer text-[13px] text-muted-foreground',
                'data-[selected=true]:bg-secondary data-[selected=true]:text-foreground'
              )}
            >
              <Icon size={14} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              <ArrowRight size={12} className="opacity-0 group-data-[selected=true]:opacity-100" />
            </Command.Item>
          ))}
        </Command.Group>

        {/* Company search — rendered by a child that handles its own query */}
        <CompanyResults onSelect={(slug) => navigate(`/portfolio/${slug}`)} />
      </Command.List>
    </Command>
  )
}

function CompanyResults({ onSelect }: { onSelect: (slug: string) => void }) {
  // cmdk provides the search value via Command.useCommandState
  // We use a search input that cmdk manages — results filtered client-side via value matching
  // For actual DB search we'd wire up a server query; for Phase 3, cmdk's built-in filter is sufficient

  const { data: companies = [] } = useQuery<SearchResult[]>({
    queryKey: ['companies-search'],
    queryFn: () => fetch('/api/search').then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  if (companies.length === 0) return null

  return (
    <Command.Group
      heading={
        <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none block">
          Portfolio Companies
        </span>
      }
    >
      {companies.map((c) => (
        <Command.Item
          key={c.id}
          value={c.name}
          onSelect={() => onSelect(c.slug)}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-md cursor-pointer text-[13px]',
            'data-[selected=true]:bg-secondary'
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full flex-shrink-0',
              HEALTH_DOT[c.healthStatus] ?? 'bg-muted-foreground'
            )}
          />
          <span className="flex-1 text-foreground">{c.name}</span>
          <span className="text-[11px] text-muted-foreground">{c.sector}</span>
        </Command.Item>
      ))}
    </Command.Group>
  )
}
