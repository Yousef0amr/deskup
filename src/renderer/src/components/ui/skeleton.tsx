import * as React from 'react'
import { cn } from '../../lib/utils'

/** Shadcn-style animated placeholder block for loading states. */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-elevated', className)}
      {...props}
    />
  )
}

export { Skeleton }
