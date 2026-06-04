import * as React from 'react'
import { cn } from '../lib/utils'

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  actions?: React.ReactNode
}

function PageHeader({ title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)} {...props}>
      <div>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}

export { PageHeader }
