import { Plus } from 'lucide-react'
import type { ParseKeys } from 'i18next'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

/**
 * The conversation-list filter tabs.
 *
 * A real tablist, not a row of buttons: a screen reader should announce how many
 * filters there are and which one is showing. Each tab carries its unread count,
 * which is the only number in the sidebar that means anything.
 */
export type BuiltInChatListFilter = 'all' | 'direct' | 'group' | 'channel' | 'saved'
export type ChatListFilter = BuiltInChatListFilter | `folder:${string}`

export type ChatFolderTab = { id: string; name: string; unread: number }

const FILTERS: ReadonlyArray<{ id: BuiltInChatListFilter; labelKey: ParseKeys }> = [
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
  unread: Record<BuiltInChatListFilter, number>
  folders: ChatFolderTab[]
  onCreateFolder: () => void
  onEditFolder: (folderId: string) => void
}

export function ChatListFilters({ value, onChange, unread, folders, onCreateFolder, onEditFolder }: ChatListFiltersProps) {
  const { t } = useTranslation()
  const tabsRef = useRef<HTMLDivElement>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editedOnHold = useRef(false)

  function stopHold(): void {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current)
    holdTimer.current = null
  }

  useEffect(() => stopHold, [])

  useEffect(() => {
    const tabs = tabsRef.current
    if (tabs === null) return

    const handleWheel = (event: WheelEvent): void => {
      if (event.ctrlKey) return

      const maxScrollLeft = tabs.scrollWidth - tabs.clientWidth
      if (maxScrollLeft <= 0) return

      const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? tabs.clientWidth
          : 1
      const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * scale
      if (delta === 0) return

      const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, tabs.scrollLeft + delta))
      if (nextScrollLeft === tabs.scrollLeft) return

      // The vertical wheel normally scrolls the page. Over this horizontal
      // tab strip, use it to move between filters instead.
      event.preventDefault()
      tabs.scrollLeft = nextScrollLeft
    }

    tabs.addEventListener('wheel', handleWheel, { passive: false })
    return () => tabs.removeEventListener('wheel', handleWheel)
  }, [])

  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-2">
      <div
        ref={tabsRef}
        role="tablist"
        aria-label={t('chatList.filtersLabel')}
        className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto"
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
      {folders.map((folder) => {
        const id: ChatListFilter = `folder:${folder.id}`
        const active = value === id
        return (
          <button
            key={folder.id}
            type="button"
            role="tab"
            aria-selected={active}
            onPointerDown={(event) => {
              if (event.button !== 0) return
              editedOnHold.current = false
              stopHold()
              holdTimer.current = setTimeout(() => {
                editedOnHold.current = true
                onEditFolder(folder.id)
              }, 500)
            }}
            onPointerUp={stopHold}
            onPointerCancel={stopHold}
            onPointerLeave={stopHold}
            onContextMenu={(event) => {
              event.preventDefault()
              editedOnHold.current = true
              stopHold()
              onEditFolder(folder.id)
            }}
            onClick={() => {
              if (editedOnHold.current) {
                editedOnHold.current = false
                return
              }
              onChange(id)
            }}
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
              active ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:bg-bg-hover hover:text-fg',
            )}
          >
            <span className="max-w-32 truncate">{folder.name}</span>
            {folder.unread > 0 ? (
              <span className={cn('rounded-full px-1.5 text-[10px] tabular-nums', active ? 'bg-accent-fg/20' : 'bg-accent text-accent-fg')}>
                {folder.unread > 99 ? '99+' : folder.unread}
              </span>
            ) : null}
          </button>
        )
      })}
      </div>
      <button
        type="button"
        aria-label={t('chatFolders.createTitle')}
        title={t('chatFolders.createTitle')}
        onClick={onCreateFolder}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-muted hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  )
}
