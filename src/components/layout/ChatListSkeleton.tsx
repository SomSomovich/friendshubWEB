import { useTranslation } from 'react-i18next'
import { Skeleton, SkeletonRows } from '../ui/Skeleton'

/**
 * The shape of the conversation list, before it is known.
 *
 * A row is an avatar, a name and a line of preview, so the placeholder is
 * exactly that — the list does not move when the real rows arrive.
 */
export function ChatListSkeleton() {
  const { t } = useTranslation()

  return (
    <div role="status" aria-label={t('common.loading')} className="px-2 py-2">
      <SkeletonRows
        count={7}
        row={
          <div className="flex items-center gap-3 px-2 py-2">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        }
      />
    </div>
  )
}
