import * as React from 'react'
import { cn } from '../../lib/utils'

interface WidgetHeaderProps {
  icon: React.ComponentType<{ className?: string }>
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

/** Shared header for dashboard widgets so every card reads the same way. */
export function WidgetHeader({ icon: Icon, title, subtitle, actions, className }: WidgetHeaderProps): React.JSX.Element {
  return (
    <div className={cn('mb-3 flex min-h-8 items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted" />
        <h3 className="truncate text-[13px] font-semibold text-text">{title}</h3>
        {subtitle && <span className="truncate text-xs text-muted">{subtitle}</span>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  )
}
