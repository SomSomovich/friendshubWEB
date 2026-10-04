import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type ScreenPlaceholderProps = {
  icon: LucideIcon
  title: string
  description: string
  children?: ReactNode
}

/**
 * The card used by screens that are not implemented yet: it is honest about
 * being unfinished and is replaced screen by screen as the real implementations
 * land. Content that is merely empty (a list with nothing in it) uses
 * `EmptyState` instead — that is a state of a working screen, not a gap.
 */
export function ScreenPlaceholder({
  icon: Icon,
  title,
  description,
  children,
}: ScreenPlaceholderProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-bg-elevated px-6 py-8">
        <Icon className="size-10 text-accent" aria-hidden />
        <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase text-fg-muted">
          {t('common.pendingBadge')}
        </span>
        <h1 className="text-lg font-semibold text-fg">{title}</h1>
        <p className="text-sm text-fg-muted">{description}</p>
        {children}
      </div>
    </div>
  )
}
