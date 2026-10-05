import { Check, CheckCheck, Clock, MessageSquareDashed } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLongPress } from '../../hooks/useLongPress'
import type { AttachmentMime } from '../../attachments/mime'
import { useUiStore } from '../../state/uiStore'
import type { MessageRecord } from '../../storage/db'
import type { MessageStatus } from '../../types'
import { formatFullTimestamp, formatMessageTime } from '../../utils/chatTime'
import { cn } from '../../utils/cn'
import { countReactions } from '../../utils/reactions'
import { splitLinks } from '../../utils/urls'
import { AttachmentView } from './AttachmentView'
import { MessageReactions } from './MessageReactions'

export type MessageBubbleProps = {
  message: MessageRecord
  /** True when this account sent it, which is what decides the side it sits on. */
  own: boolean
  /** The sender's name, shown only for somebody else's message in a group. */
  senderName: string | null
  language: string
  /**
   * What to draw on the tick, which is not always what is stored: a message the
   * peer has read is `read` whether or not this device was ever told it was
   * delivered.
   */
  status: MessageStatus
  /** Briefly outlined after a search hit or a pinned message jumped here. */
  highlighted: boolean
  selfAccountId: string
  onContextMenu: (x: number, y: number) => void
  onToggleReaction: (emoji: string) => void
  /** Opens one attachment full-screen. */
  onOpenAttachment: (url: string, mime: AttachmentMime) => void
  registerNode: (envelopeId: string, element: HTMLLIElement | null) => void
}

export function MessageBubble({
  message,
  own,
  senderName,
  language,
  status,
  highlighted,
  selfAccountId,
  onContextMenu,
  onToggleReaction,
  onOpenAttachment,
  registerNode,
}: MessageBubbleProps) {
  const { t } = useTranslation()
  const longPress = useLongPress(onContextMenu)
  const openProfile = useUiStore((state) => state.openProfile)

  // Stable per message: a new closure on every render would make React detach
  // and reattach the ref for every bubble in the list.
  const setRef = useCallback(
    (element: HTMLLIElement | null) => {
      registerNode(message.envelopeId, element)
    },
    [registerNode, message.envelopeId],
  )

  const reactions = countReactions(message.reactions, selfAccountId)
  const statusLabel = t(`chat.status.${status}`)

  return (
    <li
      ref={setRef}
      className={cn('flex px-1', own ? 'justify-end' : 'justify-start')}
    >
      <div className={cn('flex max-w-[85%] flex-col sm:max-w-[70%]', own ? 'items-end' : 'items-start')}>
        <div
          onContextMenu={(event) => {
            event.preventDefault()
            onContextMenu(event.clientX, event.clientY)
          }}
          {...longPress}
          className={cn(
            'rounded-2xl px-3 py-2 text-sm text-fg',
            own ? 'bg-accent/20 ring-1 ring-accent/30' : 'bg-bg-elevated',
            highlighted && 'ring-2 ring-accent',
          )}
        >
          {senderName === null ? null : (
            <button
              type="button"
              onClick={() => {
                openProfile(message.senderAccountId)
              }}
              className="mb-0.5 cursor-pointer rounded text-xs font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            >
              {senderName}
            </button>
          )}

          {message.attachments.length === 0 ? null : (
            // A grid because a message can carry several, and three pictures in
            // a column is a wall rather than a message.
            <div
              className={cn(
                'mb-1 grid gap-1',
                message.attachments.length === 1
                  ? 'grid-cols-1'
                  : message.attachments.length === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-3',
              )}
            >
              {message.attachments.map((attachmentId) => (
                <AttachmentView
                  key={attachmentId}
                  accountId={selfAccountId}
                  attachmentId={attachmentId}
                  onOpen={onOpenAttachment}
                />
              ))}
            </div>
          )}

          {message.plaintext === null ? (
            <p className="flex items-center gap-1.5 text-xs text-fg-muted italic">
              <MessageSquareDashed className="size-3.5 shrink-0" aria-hidden />
              {t('chat.undecryptable')}
            </p>
          ) : (
            <p className="text-pretty whitespace-pre-wrap break-words">
              {splitLinks(message.plaintext).map((segment, index) =>
                segment.kind === 'link' ? (
                  <a
                    key={index}
                    href={segment.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline underline-offset-2 hover:no-underline"
                  >
                    {segment.text}
                  </a>
                ) : (
                  <span key={index}>{segment.text}</span>
                ),
              )}
            </p>
          )}

          <p
            className="mt-1 flex items-center justify-end gap-1.5 text-[11px] leading-none text-fg-muted"
            title={formatFullTimestamp(message.clientTimestamp, language)}
          >
            {message.editedAt == null ? null : <span>{t('chat.edited')}</span>}
            <span className="tabular-nums">{formatMessageTime(message.clientTimestamp)}</span>
            {own ? <StatusIcon status={status} label={statusLabel} /> : null}
          </p>
        </div>

        <MessageReactions
          reactions={reactions}
          labelFor={(reaction) =>
            // `n`, not `count`: i18next treats `count` as a request for a plural
            // form, and this key has none.
            t('chat.reactions.toggle', { emoji: reaction.emoji, n: reaction.count })
          }
          onToggle={onToggleReaction}
        />
      </div>
    </li>
  )
}

/**
 * One check for `sent`, two for `delivered`, and two in the accent colour for
 * `read` — the only state that reaches the end of the line. The colour never
 * carries the meaning on its own: every icon also has a translated label.
 */
function StatusIcon({ status, label }: { status: MessageStatus; label: string }) {
  if (status === 'failed') {
    return (
      <span role="img" aria-label={label} className="text-danger">
        <MessageSquareDashed className="size-3.5" aria-hidden />
      </span>
    )
  }

  // Waiting to leave: a clock, not a tick. A tick here would claim the server
  // has the message when the connection is exactly what is missing.
  if (status === 'sending') {
    return (
      <span role="img" aria-label={label} title={label} className="text-fg-muted">
        <Clock className="size-3.5" aria-hidden />
      </span>
    )
  }

  const double = status === 'delivered' || status === 'read'
  const Icon = double ? CheckCheck : Check

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(status === 'read' ? 'text-accent' : 'text-fg-muted')}
    >
      <Icon className="size-3.5" aria-hidden />
    </span>
  )
}
