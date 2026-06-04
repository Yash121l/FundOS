'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, Users, TrendingDown, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DigestGroup {
  category: string
  severity: 'critical' | 'high' | 'medium'
  count: number
  companies: string[]
  narrative: string
  coordinatedAction: string
}

interface WeeklyBriefData {
  weekOf: string
  totalAlerts: number
  overallSummary: string
  groups: DigestGroup[]
  generatedAt: string
}

interface WeeklyBriefProps {
  digest: WeeklyBriefData | null
  recentAlertsCount: number
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'Burn & Runway': TrendingDown,
  'Team & Hiring': Users,
  'Revenue': TrendingDown,
}

function getCategoryIcon(category: string) {
  return CATEGORY_ICONS[category] ?? AlertTriangle
}

export function WeeklyBriefPanel({ digest, recentAlertsCount }: WeeklyBriefProps) {
  const [expanded, setExpanded] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())

  if (!digest && recentAlertsCount === 0) return null

  function toggleGroup(i: number) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const totalAlerts = digest?.totalAlerts ?? recentAlertsCount
  const hasCritical = digest?.groups?.some((g) => g.severity === 'critical')

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors"
      >
        <div className={cn(
          'h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0',
          hasCritical ? 'bg-destructive/10' : 'bg-amber-500/10'
        )}>
          <Shield size={13} className={hasCritical ? 'text-destructive' : 'text-amber-400'} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-[13px] font-medium">Weekly Intelligence Brief</p>
          <p className="text-[11px] text-muted-foreground">
            {totalAlerts} high-severity alert{totalAlerts !== 1 ? 's' : ''} this week
            {digest ? ` · ${digest.weekOf}` : ''}
          </p>
        </div>
        {expanded ? (
          <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {expanded && digest && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {/* Summary */}
          <p className="text-[12px] text-muted-foreground leading-relaxed">{digest.overallSummary}</p>

          {/* Groups */}
          {digest.groups.map((group, i) => {
            const Icon = getCategoryIcon(group.category)
            const isOpen = expandedGroups.has(i)

            return (
              <div key={`${group.category}-${i}`} className="rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleGroup(i)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/30 transition-colors"
                >
                  <Icon size={12} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <span className="text-[12px] font-medium">{group.category}</span>
                    <span className="text-[11px] text-muted-foreground ml-2">
                      {group.count} alert{group.count !== 1 ? 's' : ''} · {group.companies.length} compan{group.companies.length !== 1 ? 'ies' : 'y'}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronDown size={12} className="text-muted-foreground" />
                  ) : (
                    <ChevronRight size={12} className="text-muted-foreground" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-border px-3 py-2.5 space-y-2 bg-secondary/20">
                    <p className="text-[12px] text-foreground leading-relaxed">{group.narrative}</p>
                    <div className="flex flex-wrap gap-1">
                      {group.companies.map((c, idx) => (
                        <span key={idx} className="text-[10px] bg-card border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                          {c}
                        </span>
                      ))}
                    </div>
                    <div className="rounded-md bg-primary/5 border border-primary/10 px-2.5 py-2">
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-0.5">Recommended action</p>
                      <p className="text-[12px] text-foreground">{group.coordinatedAction}</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {expanded && !digest && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-[12px] text-muted-foreground">
            {recentAlertsCount} high-severity alerts raised this week. Run the nightly digest job to see grouped analysis and recommendations.
          </p>
        </div>
      )}
    </div>
  )
}
