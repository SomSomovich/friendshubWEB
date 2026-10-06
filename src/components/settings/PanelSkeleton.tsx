import { useTranslation } from 'react-i18next'
import { Skeleton, SkeletonRows } from '../ui/Skeleton'

/**
 * A settings panel that is still reading.
 *
 * Every panel in the app has the same shape — a heading line and a line of
 * detail — so one placeholder serves the device list, the session list and the
 * notification switches alike. A spinner in a panel is the case this replaces:
 * it says "something is happening" where the panel could say "a list is coming".
 */
export function PanelSkeleton({ rows = 2 }: { rows?: number }) {
  const { t } = useTranslation()

  return (
    <div role="status" aria-label={t('common.loading')}>
      <SkeletonRows
        count={rows}
        row={
          <div className="flex flex-col gap-1.5 py-0.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        }
      />
    </div>
  )
}
