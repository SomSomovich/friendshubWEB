import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  /** A call to action, when there is something useful to offer. */
  action?: ReactNode
  className?: string
}

/**
 * Never a blank area: every list and every panel shows an icon and a sentence
 * explaining what would appear here.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-6 py-10 text-center',
        className,
      )}
    >
      <Icon className="size-8 text-fg-muted" aria-hidden />
      <p className="text-sm font-medium text-fg">{title}</p>
      {description === undefined ? null : (
        <p className="max-w-xs text-xs text-pretty text-fg-muted">{description}</p>
      )}
      {action === undefined ? null : <div className="mt-2">{action}</div>}
    </div>
  )
}
