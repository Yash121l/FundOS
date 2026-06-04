'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { HealthBadge, SectorBadge } from '@fundos/ui'
import { formatMrr, formatPercent, formatRunway, stageLabel } from '@fundos/shared'
import { cn } from '@/lib/utils'
import type { CompanyRow } from '@/lib/portfolio'

// ── Helpers ────────────────────────────────────────────────

function m(row: CompanyRow) {
  return row.metrics[0] ?? null
}

function runwayColor(months: number | null | undefined): string {
  if (months == null) return 'text-muted-foreground'
  if (months < 6) return 'text-red-400'
  if (months < 12) return 'text-amber-400'
  return 'text-foreground'
}

function growthColor(g: number | null | undefined): string {
  if (g == null) return 'text-muted-foreground'
  if (g < 0) return 'text-red-400'
  if (g < 0.03) return 'text-amber-400'
  return 'text-emerald-400'
}

function scoreColor(s: number): string {
  if (s < 40) return 'text-red-400'
  if (s < 65) return 'text-amber-400'
  return 'text-emerald-400'
}

function CompanyAvatar({ name, sector }: { name: string; sector: string }) {
  const COLORS: Record<string, string> = {
    SAAS: 'bg-blue-500/20 text-blue-400',
    AI: 'bg-purple-500/20 text-purple-400',
    FINTECH: 'bg-violet-500/20 text-violet-400',
    DEVTOOLS: 'bg-cyan-500/20 text-cyan-400',
    CLIMATETECH: 'bg-green-500/20 text-green-400',
  }
  return (
    <div
      className={cn(
        'h-7 w-7 rounded-md flex items-center justify-center text-[11px] font-semibold flex-shrink-0',
        COLORS[sector] ?? 'bg-zinc-500/20 text-zinc-400'
      )}
    >
      {name.charAt(0)}
    </div>
  )
}

function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (!isSorted) return <ArrowUpDown size={11} className="opacity-30" />
  return isSorted === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
}

// ── Column definitions ─────────────────────────────────────

const columns: ColumnDef<CompanyRow>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Company',
    cell: ({ row: r }) => (
      <div className="flex items-center gap-2.5">
        <CompanyAvatar name={r.original.name} sector={r.original.sector} />
        <span className="font-medium text-[13px] text-foreground">{r.original.name}</span>
      </div>
    ),
    enableSorting: true,
  },
  {
    id: 'sector',
    accessorKey: 'sector',
    header: 'Sector',
    cell: ({ getValue }) => <SectorBadge sector={getValue<string>()} />,
    enableSorting: true,
  },
  {
    id: 'stage',
    accessorKey: 'stage',
    header: 'Stage',
    cell: ({ getValue }) => (
      <span className="text-[12px] text-muted-foreground">{stageLabel(getValue<string>())}</span>
    ),
    enableSorting: true,
  },
  {
    id: 'mrr',
    accessorFn: (r) => m(r)?.mrr ?? -1,
    header: 'MRR',
    cell: ({ row: r }) => {
      const v = m(r.original)?.mrr
      return (
        <span className="tabular-nums text-[13px]">{v != null ? formatMrr(v) : '—'}</span>
      )
    },
    enableSorting: true,
  },
  {
    id: 'growth',
    accessorFn: (r) => m(r)?.revenueGrowthMom ?? -999,
    header: 'Growth',
    cell: ({ row: r }) => {
      const v = m(r.original)?.revenueGrowthMom
      return (
        <span className={cn('tabular-nums text-[13px]', growthColor(v))}>
          {v != null ? formatPercent(v) : '—'}
        </span>
      )
    },
    enableSorting: true,
  },
  {
    id: 'burn',
    accessorFn: (r) => m(r)?.burnRate ?? -1,
    header: 'Burn',
    cell: ({ row: r }) => {
      const v = m(r.original)?.burnRate
      return (
        <span className="tabular-nums text-[13px] text-muted-foreground">
          {v != null ? formatMrr(v) : '—'}
        </span>
      )
    },
    enableSorting: true,
  },
  {
    id: 'runway',
    accessorFn: (r) => m(r)?.runway ?? -1,
    header: 'Runway',
    cell: ({ row: r }) => {
      const v = m(r.original)?.runway
      return (
        <span className={cn('tabular-nums text-[13px] font-medium', runwayColor(v))}>
          {v != null ? formatRunway(v) : '—'}
        </span>
      )
    },
    enableSorting: true,
  },
  {
    id: 'healthScore',
    accessorKey: 'healthScore',
    header: 'Score',
    cell: ({ getValue }) => {
      const s = getValue<number>()
      return (
        <span className={cn('tabular-nums text-[13px] font-semibold', scoreColor(s))}>
          {Math.round(s)}
        </span>
      )
    },
    enableSorting: true,
  },
  {
    id: 'healthStatus',
    accessorKey: 'healthStatus',
    header: 'Status',
    cell: ({ getValue }) => (
      <HealthBadge status={getValue<'HEALTHY' | 'WATCHLIST' | 'AT_RISK'>()} />
    ),
    enableSorting: true,
  },
]

// ── Filters ────────────────────────────────────────────────

interface Filters {
  search: string
  sector: string
  stage: string
  health: string
}

function filterCompanies(data: CompanyRow[], f: Filters): CompanyRow[] {
  return data.filter((c) => {
    if (f.search && !c.name.toLowerCase().includes(f.search.toLowerCase())) return false
    if (f.sector && c.sector !== f.sector) return false
    if (f.stage && c.stage !== f.stage) return false
    if (f.health && c.healthStatus !== f.health) return false
    return true
  })
}

// ── Table component ────────────────────────────────────────

interface Props {
  data: CompanyRow[]
  initialHealth?: string
}

export function PortfolioTable({ data, initialHealth = '' }: Props) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'healthScore', desc: false }])
  const [filters, setFilters] = useState<Filters>({ search: '', sector: '', stage: '', health: initialHealth })
  const [activeRow, setActiveRow] = useState(0)
  const tableRef = useRef<HTMLTableElement>(null)

  const filteredData = useMemo(() => filterCompanies(data, filters), [data, filters])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  })

  const rows = table.getRowModel().rows

  const navigate = useCallback(
    (slug: string) => router.push(`/portfolio/${slug}`),
    [router]
  )

  // j/k/Enter keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.key === 'j') setActiveRow((r) => Math.min(r + 1, rows.length - 1))
      else if (e.key === 'k') setActiveRow((r) => Math.max(r - 1, 0))
      else if (e.key === 'Enter' && rows[activeRow]) {
        navigate(rows[activeRow]!.original.slug)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [rows, activeRow, navigate])

  // ── Unique filter options ─────────────────────────────────
  const sectors = [...new Set(data.map((c) => c.sector))].sort()
  const stages = [...new Set(data.map((c) => c.stage))].sort()

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Search companies..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="h-8 w-52 rounded-lg border border-border bg-card px-3 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <select
          value={filters.sector}
          onChange={(e) => setFilters((f) => ({ ...f, sector: e.target.value }))}
          className="h-8 rounded-lg border border-border bg-card px-2 text-[13px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filters.stage}
          onChange={(e) => setFilters((f) => ({ ...f, stage: e.target.value }))}
          className="h-8 rounded-lg border border-border bg-card px-2 text-[13px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>{stageLabel(s)}</option>
          ))}
        </select>
        <select
          value={filters.health}
          onChange={(e) => setFilters((f) => ({ ...f, health: e.target.value }))}
          className="h-8 rounded-lg border border-border bg-card px-2 text-[13px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Health</option>
          <option value="HEALTHY">Healthy</option>
          <option value="WATCHLIST">Watchlist</option>
          <option value="AT_RISK">At Risk</option>
        </select>

        {(filters.search || filters.sector || filters.stage || filters.health) && (
          <button
            onClick={() => setFilters({ search: '', sector: '', stage: '', health: '' })}
            className="h-8 px-3 text-[12px] text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-secondary/60 transition-colors"
          >
            Clear
          </button>
        )}

        <div className="flex-1" />
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {filteredData.length} of {data.length}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border bg-card">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        'px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 whitespace-nowrap',
                        header.column.getCanSort() && 'cursor-pointer hover:text-foreground select-none'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <SortIcon isSorted={header.column.getIsSorted()} />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(row.original.slug)}
                  onMouseEnter={() => setActiveRow(i)}
                  className={cn(
                    'border-b border-border last:border-0 cursor-pointer transition-colors',
                    i === activeRow ? 'bg-secondary/60' : 'hover:bg-secondary/40'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-[13px] text-muted-foreground">
                    No companies match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground/40">
        Use <kbd className="font-mono">j</kbd> / <kbd className="font-mono">k</kbd> to navigate · <kbd className="font-mono">↵</kbd> to open
      </p>
    </div>
  )
}
