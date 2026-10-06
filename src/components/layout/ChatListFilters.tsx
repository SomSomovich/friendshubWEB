import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

/**
 * The conversation-list filter tabs.
 *
 * A real tablist, not a row of buttons: a screen reader should announce how many
 * filters there are and which one is showing. Each tab carries its unread count,
 * which is the only number in the sidebar that means anything.
 */
export type ChatListFilter = 'all' | 'direct' | 'group' | 'channel' | 'saved'

const FILTERS: ReadonlyArray<{ id: ChatListFilter; labelKey: ParseKeys }> = [
  { id: 'all', labelKey: 'chatList.filters.all' },
  { id: 'direct', labelKey: 'chatList.filters.direct' },
  { id: 'group', labelKey: 'chatList.filters.group' },
  { id: 'channel', labelKey: 'chatList.filters.channel' },
  { id: 'saved', labelKey: 'chatList.filters.saved' },
]

export type ChatListFiltersProps = {
  value: ChatListFilter
  onChange: (filter: ChatListFilter) => void
  /** Unread count per filter, so a collapsed tab still says something is waiting. */
  unread: Record<ChatListFilter, number>
}

export function ChatListFilters({ value, onChange, unread }: ChatListFiltersProps) {
  const { t } = useTranslation()

  return (
    <div
      role="tablist"
      aria-label={t('chatList.filtersLabel')}
      className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-border px-2 py-2"
    >
      {FILTERS.map((entry) => {
        const isActive = entry.id === value
        const count = unread[entry.id]
        return (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              onChange(entry.id)
            }}
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
              isActive ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:bg-bg-hover hover:text-fg',
            )}
          >
            {t(entry.labelKey)}
            {count > 0 ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px] tabular-nums',
                  isActive ? 'bg-accent-fg/20' : 'bg-accent text-accent-fg',
                )}
              >
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
