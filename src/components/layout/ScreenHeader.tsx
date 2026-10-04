import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

export type ScreenHeaderProps = {
  title: string
  subtitle?: string
  onBack?: () => void
  /**
   * `mobile` shows the back button only below `md`, where the list and the
   * screen cannot both be visible; `always` is for screens that are not a
   * conversation and need a way out on desktop too.
   */
  backMode?: 'mobile' | 'always'
  backLabel?: string
  /** Trailing controls: call buttons, overflow menu, and so on. */
  actions?: ReactNode
  titleAccessory?: ReactNode
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backMode = 'mobile',
  backLabel,
  actions,
  titleAccessory,
}: ScreenHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className="flex items-center gap-2 border-b border-border p-3">
      {onBack === undefined ? null : (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel ?? t('common.back')}
          className={cn(
            'flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-muted hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            backMode === 'mobile' && 'md:hidden',
          )}
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
      )}

      {titleAccessory}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{title}</p>
        {subtitle === undefined ? null : (
          <p className="truncate text-xs text-fg-muted">{subtitle}</p>
        )}
      </div>

      {actions === undefined ? null : (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      )}
    </header>
  )
}
