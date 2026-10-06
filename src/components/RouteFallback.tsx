import { useTranslation } from 'react-i18next'
import { Spinner } from './ui/Spinner'

/**
 * What is on screen while a lazily-loaded route is still being fetched.
 *
 * A spinner rather than a skeleton: the chunk has not arrived, so there is no
 * shape to stand in for yet — and this is only ever visible on the first visit
 * to a screen, since the browser caches the module afterwards.
 */
export function RouteFallback() {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      aria-label={t('common.loading')}
      className="flex min-h-0 flex-1 items-center justify-center py-16"
    >
      <Spinner className="size-6 text-fg-muted" />
    </div>
  )
}
