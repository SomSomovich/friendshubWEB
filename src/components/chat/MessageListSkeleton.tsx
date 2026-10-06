import { useTranslation } from 'react-i18next'
import { Skeleton } from '../ui/Skeleton'

/**
 * A transcript that has not been read out of storage yet.
 *
 * The rows alternate sides and vary in width for the same reason the real ones
 * do, so the panel does not visibly rearrange itself the moment the messages
 * land. Anchored to the bottom, which is where a conversation starts.
 */

type RowShape = {
  own: boolean
  width: string
}

const ROWS: readonly RowShape[] = [
  { own: false, width: 'w-2/5' },
  { own: false, width: 'w-3/5' },
  { own: true, width: 'w-1/3' },
  { own: false, width: 'w-1/2' },
  { own: true, width: 'w-2/5' },
  { own: false, width: 'w-1/4' },
]

export function MessageListSkeleton() {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      aria-label={t('common.loading')}
      className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden px-3 pb-4"
    >
      {ROWS.map((row, index) => (
        <div
          key={index}
          className={row.own ? 'flex justify-end px-1' : 'flex justify-start px-1'}
        >
          <Skeleton className={`h-10 ${row.width} rounded-2xl`} />
        </div>
      ))}
    </div>
  )
}
