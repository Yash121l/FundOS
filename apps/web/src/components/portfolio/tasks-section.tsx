import { CheckSquare } from 'lucide-react'
import { formatDate } from '@fundos/shared'
import { cn } from '@/lib/utils'
import type { CompanyDetail } from '@/lib/portfolio'

type Task = CompanyDetail['tasks'][number]

const PRIORITY_DOT: Record<string, string> = {
  HIGH: 'bg-orange-400',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-zinc-500',
}

const STATUS_LABEL: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
}

export function TasksSection({ tasks }: { tasks: Task[] }) {
  const active = tasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')
  const done = tasks.filter((t) => t.status === 'DONE')

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare size={14} className="text-muted-foreground" />
          <p className="text-[13px] font-medium">Tasks</p>
        </div>
        <p className="text-[13px] text-muted-foreground text-center py-4">No tasks for this company.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare size={14} className="text-blue-400" />
          <p className="text-[13px] font-medium">Tasks</p>
        </div>
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {active.length} open{done.length > 0 ? ` · ${done.length} done` : ''}
        </span>
      </div>

      <div className="space-y-1.5">
        {[...active, ...done].map((t) => (
          <div key={t.id} className={cn(
            'flex items-start gap-2.5 rounded-md px-2.5 py-2',
            t.status === 'DONE' ? 'opacity-50' : 'hover:bg-secondary/30'
          )}>
            <span className={cn(
              'h-2 w-2 rounded-full flex-shrink-0 mt-1.5',
              PRIORITY_DOT[t.priority] ?? PRIORITY_DOT.MEDIUM
            )} />
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-[13px] font-medium',
                t.status === 'DONE' ? 'line-through text-muted-foreground' : 'text-foreground'
              )}>{t.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground">{STATUS_LABEL[t.status]}</span>
                {t.dueDate && (
                  <span className="text-[11px] text-muted-foreground/60">· Due {formatDate(t.dueDate)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
