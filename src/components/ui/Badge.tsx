import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type BadgeProps = {
  /** Shown when no `count` is given. */
  children?: ReactNode
  /** Caps the counter at "99+". */
  count?: number
  className?: string
}

/**
 * The unread counter. `count` is separate from `children` so the cap does not
 * have to be re-implemented at every call site.
 */
export function Badge({ children, count, className }: BadgeProps) {
  const text = count === undefined ? children : count > 99 ? '99+' : String(count)

  return (
    <span
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] leading-none font-semibold text-accent-fg tabular-nums',
        className,
      )}
    >
      {text}
    </span>
  )
}

export type PresenceDotProps = {
  online: boolean
  className?: string
}

/**
 * The online dot. Colour alone never carries the meaning: it is paired with the
 * translated label wherever it is shown (rule: both themes, both languages).
 */
export function PresenceDot({ online, className }: PresenceDotProps) {
  return (
    <span
      className={cn(
        'inline-block size-2.5 shrink-0 rounded-full border border-bg',
        online ? 'bg-online' : 'bg-fg-muted',
        className,
      )}
    />
  )
}
