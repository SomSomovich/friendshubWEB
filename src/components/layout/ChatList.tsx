import { Archive, ArchiveRestore, Check, MessageSquare, VolumeX, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ParseKeys, TFunction } from 'i18next'
import { useMatch, useNavigate } from 'react-router-dom'
import {
  archiveConversation,
  muteConversation,
  unarchiveConversation,
  unmuteConversation,
} from '../../api/conversations'
import { useChatList, type ChatListRowData } from '../../hooks/useChatList'
import { useToast } from '../../hooks/useToast'
import { ROUTES, chatPath } from '../../router/paths'
import { requireAccountStore } from '../../state/accountRegistry'
import { deleteConversationLocally } from '../../storage/conversations'
import { hideConversation, markConversationRead } from '../../storage/read_state'
import type { Account } from '../../types'
import { cn } from '../../utils/cn'
import { ContextMenu } from '../ui/ContextMenu'
import type { DropdownItem } from '../ui/DropdownMenu'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import { ChatListRow } from './ChatListRow'
import { MuteDialog, type MuteChoice } from './MuteDialog'

export type ChatListFilter = 'all' | 'direct' | 'group' | 'channel' | 'saved'

const FILTERS: Array<{ id: ChatListFilter; labelKey: ParseKeys }> = [
  { id: 'all', labelKey: 'chatList.filters.all' },
  { id: 'direct', labelKey: 'chatList.filters.direct' },
  { id: 'group', labelKey: 'chatList.filters.group' },
  { id: 'channel', labelKey: 'chatList.filters.channel' },
  { id: 'saved', labelKey: 'chatList.filters.saved' },
]

export type ChatListProps = {
  account: Account
  /** The search field's value, owned by the sidebar. */
  query: string
}

export function ChatList({ account, query }: ChatListProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const match = useMatch(`${ROUTES.app}/chat/:id`)
  const activeId = match?.params.id

  const { rows, loading, error, reload } = useChatList(account)
  const [filter, setFilter] = useState<ChatListFilter>('all')
  const [menu, setMenu] = useState<{ row: ChatListRowData; x: number; y: number } | null>(null)
  const [muteTarget, setMuteTarget] = useState<ChatListRowData | null>(null)

  const visible = useMemo(() => filterRows(rows, filter, query), [rows, filter, query])
  const unreadByFilter = useMemo(() => countUnread(rows), [rows])

  function refreshConversations(): void {
    void requireAccountStore(account.id)
      .getState()
      .actions.loadConversations()
  }

  function openRow(row: ChatListRowData): void {
    // Opening a conversation is what marks it read; the badge already reflects
    // the local state, so it clears as the messages are seen.
    void markConversationRead(account.id, row.conversation.id)
    void navigate(chatPath(row.conversation.id))
  }

  async function chooseMute(choice: MuteChoice): Promise<void> {
    const target = muteTarget
    if (target === null) {
      return
    }
    try {
      if (choice.kind === 'unmute') {
        await unmuteConversation(account, target.conversation.id)
      } else {
        await muteConversation(account, target.conversation.id, choice.durationSeconds)
      }
      refreshConversations()
    } catch (cause) {
      reportActionFailure(cause, t, toast)
    }
  }

  function buildMenuItems(row: ChatListRowData): DropdownItem[] {
    const muted = row.conversation.mutedUntil !== null
    const archived = row.conversation.archivedAt !== null

    return [
      {
        id: 'read',
        label: t('chatList.menu.markRead'),
        icon: Check,
        onSelect: () => {
          void markConversationRead(account.id, row.conversation.id).then(reload)
        },
      },
      {
        id: 'mute',
        label: muted ? t('chatList.menu.unmute') : t('chatList.menu.mute'),
        icon: VolumeX,
        onSelect: () => {
          setMuteTarget(row)
        },
      },
      {
        id: 'archive',
        label: archived ? t('chatList.menu.unarchive') : t('chatList.menu.archive'),
        icon: archived ? ArchiveRestore : Archive,
        onSelect: () => {
          void (archived
            ? unarchiveConversation(account, row.conversation.id)
            : archiveConversation(account, row.conversation.id)
          )
            .then(refreshConversations)
            .catch((cause: unknown) => {
              reportActionFailure(cause, t, toast)
            })
        },
      },
      {
        id: 'delete',
        label: t('chatList.menu.delete'),
        icon: X,
        danger: true,
        onSelect: () => {
          // Both halves are needed: the local history is wiped, and the
          // conversation is marked as removed so the next sync cannot bring the
          // row back. See `isHidden` in `useChatList`.
          void deleteConversationLocally(account.id, row.conversation.id)
            .then(() => hideConversation(account.id, row.conversation.id))
            .then(() => {
              refreshConversations()
              if (row.conversation.id === activeId) {
                void navigate(ROUTES.app, { replace: true })
              }
            })
            .catch((cause: unknown) => {
              reportActionFailure(cause, t, toast)
            })
        },
      },
    ]
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        role="tablist"
        aria-label={t('chatList.filtersLabel')}
        className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-border px-2 py-2"
      >
        {FILTERS.map((entry) => {
          const isActive = entry.id === filter
          const unread = unreadByFilter[entry.id]
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setFilter(entry.id)
              }}
              className={cn(
                'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
                isActive ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:bg-bg-hover hover:text-fg',
              )}
            >
              {t(entry.labelKey)}
              {unread > 0 ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px] tabular-nums',
                    isActive ? 'bg-accent-fg/20' : 'bg-accent text-accent-fg',
                  )}
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-8">
            <Spinner className="text-fg-muted" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={query.length > 0 ? t('chatList.noResults') : t('chatList.empty')}
            description={
              query.length > 0
                ? t('chatList.noResultsHint', { query })
                : error === null
                  ? t('chatList.emptyHint')
                  : error
            }
          />
        ) : (
          <ul>
            {visible.map((row) => (
              <ChatListRow
                key={row.conversation.id}
                row={row}
                active={row.conversation.id === activeId}
                onOpen={() => {
                  openRow(row)
                }}
                onContextMenu={(x, y) => {
                  setMenu({ row, x, y })
                }}
              />
            ))}
          </ul>
        )}
      </div>

      <ContextMenu
        open={menu !== null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        items={menu === null ? [] : buildMenuItems(menu.row)}
        onClose={() => {
          setMenu(null)
        }}
      />

      <MuteDialog
        open={muteTarget !== null}
        muted={(muteTarget?.conversation.mutedUntil ?? null) !== null}
        title={muteTarget?.title ?? ''}
        onClose={() => {
          setMuteTarget(null)
        }}
        onChoose={(choice) => {
          void chooseMute(choice)
        }}
      />
    </div>
  )
}

function filterRows(rows: ChatListRowData[], filter: ChatListFilter, query: string): ChatListRowData[] {
  const needle = query.trim().toLowerCase()

  return rows.filter((row) => {
    if (filter !== 'all' && row.conversation.kind !== filter) {
      return false
    }
    if (needle.length === 0) {
      return true
    }
    return row.title.toLowerCase().includes(needle) || (row.preview ?? '').toLowerCase().includes(needle)
  })
}

/** Unread totals per tab, with "all" covering everything. */
function countUnread(rows: ChatListRowData[]): Record<ChatListFilter, number> {
  const counts: Record<ChatListFilter, number> = {
    all: 0,
    direct: 0,
    group: 0,
    channel: 0,
    saved: 0,
  }
  for (const row of rows) {
    counts.all += row.unread
    counts[row.conversation.kind] += row.unread
  }
  return counts
}

function reportActionFailure(
  cause: unknown,
  t: TFunction,
  toast: { notify: (input: { kind: 'error'; message: string }) => string },
): void {
  const message = cause instanceof Error ? cause.message : String(cause)
  console.error('[chat list] an action failed', cause)
  toast.notify({ kind: 'error', message: message.length > 0 ? message : t('chatList.actionFailed') })
}
