import { Zap } from 'lucide-react'
import { formatDate } from '@fundos/shared'
import { cn } from '@/lib/utils'
import type { CompanyDetail } from '@/lib/portfolio'

type Action = CompanyDetail['actions'][number]

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  LOW: 'text-muted-foreground bg-secondary/30 border-border',
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'text-muted-foreground',
  IN_PROGRESS: 'text-blue-400',
  COMPLETED: 'text-emerald-400 line-through opacity-60',
  DISMISSED: 'text-muted-foreground/40 line-through',
}

export function ActionsSection({ actions }: { actions: Action[] }) {
  const active = actions.filter((a) => a.status !== 'COMPLETED' && a.status !== 'DISMISSED')
  const completed = actions.filter((a) => a.status === 'COMPLETED')

  if (actions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-muted-foreground" />
          <p className="text-[13px] font-medium">Suggested Actions</p>
        </div>
        <p className="text-[13px] text-muted-foreground text-center py-4">No actions suggested yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-amber-400" />
          <p className="text-[13px] font-medium">Suggested Actions</p>
        </div>
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {active.length} pending{completed.length > 0 ? ` · ${completed.length} done` : ''}
        </span>
      </div>

      <div className="space-y-2">
        {[...active, ...completed].map((a) => (
          <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border bg-secondary/20 p-3">
            <span className={cn(
              'h-4 w-4 mt-0.5 rounded-full border-2 flex-shrink-0',
              a.status === 'COMPLETED' ? 'border-emerald-500 bg-emerald-500/20' :
              a.status === 'IN_PROGRESS' ? 'border-blue-500 bg-blue-500/20' :
              'border-border bg-transparent'
            )} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={cn('text-[13px] font-medium', STATUS_STYLES[a.status] ?? 'text-foreground')}>{a.title}</p>
                <span className={cn('text-[10px] font-semibold rounded border px-1.5 py-0.5 flex-shrink-0', PRIORITY_STYLES[a.priority] ?? PRIORITY_STYLES.MEDIUM)}>
                  {a.priority}
                </span>
              </div>
              {a.description && (
                <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{a.description}</p>
              )}
              {a.dueDate && (
                <p className="text-[11px] text-muted-foreground/60 mt-1">Due {formatDate(a.dueDate)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
