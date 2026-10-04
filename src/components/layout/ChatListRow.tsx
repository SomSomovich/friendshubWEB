import { BellOff, Pin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLongPress } from '../../hooks/useLongPress'
import type { ChatListRowData } from '../../hooks/useChatList'
import { formatChatTimestamp } from '../../utils/chatTime'
import { cn } from '../../utils/cn'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'

export type ChatListRowProps = {
  row: ChatListRowData
  active: boolean
  onOpen: () => void
  onContextMenu: (x: number, y: number) => void
}

export function ChatListRow({ row, active, onOpen, onContextMenu }: ChatListRowProps) {
  const { t, i18n } = useTranslation()
  const longPress = useLongPress(onContextMenu)

  const timestamp =
    row.at === null ? null : formatChatTimestamp(row.at, i18n.language, t('chatList.yesterday'))

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        onContextMenu={(event) => {
          event.preventDefault()
          onContextMenu(event.clientX, event.clientY)
        }}
        {...longPress}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
          active ? 'bg-bg-hover' : 'hover:bg-bg-hover',
        )}
      >
        <Avatar name={row.title} src={row.avatarUrl} size="md" />

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-fg">{row.title}</span>
            {row.muted ? <BellOff className="size-3.5 shrink-0 text-fg-muted" aria-hidden /> : null}
            {row.hasPinned ? <Pin className="size-3.5 shrink-0 text-fg-muted" aria-hidden /> : null}
            {timestamp === null ? null : (
              <span className="ml-auto shrink-0 text-[11px] text-fg-muted tabular-nums">
                {timestamp}
              </span>
            )}
          </span>

          <span className="flex items-center gap-2">
            <span className="truncate text-xs text-fg-muted">
              {row.preview ?? t('chatList.noMessages')}
            </span>
            {row.unread > 0 ? <Badge count={row.unread} className="ml-auto" /> : null}
          </span>
        </span>
      </button>
    </li>
  )
}
