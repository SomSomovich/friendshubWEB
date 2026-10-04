import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

export type SpinnerProps = {
  className?: string
  /** Screen-reader text; defaults to the translated "loading". */
  label?: string
}

export function Spinner({ className, label }: SpinnerProps) {
  const { t } = useTranslation()

  return (
    <span
      role="status"
      aria-label={label ?? t('common.loading')}
      className={cn(
        'inline-block size-5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  )
}
