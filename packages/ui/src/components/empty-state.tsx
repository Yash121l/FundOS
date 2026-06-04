import * as React from 'react'
import { cn } from '../lib/utils'

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 text-muted-foreground/40">{icon}</div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-[13px] text-muted-foreground max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export { EmptyState }
