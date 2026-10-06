import { ArrowDown, MessageSquare } from 'lucide-react'
import { useImperativeHandle, useMemo, useRef, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import type { AttachmentMime } from '../../attachments/mime'
import type { MessageRecord } from '../../storage/db'
import { cn } from '../../utils/cn'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import { MessageDayGroup } from './MessageDayGroup'
import { MessageListSkeleton } from './MessageListSkeleton'
import { groupByDay } from './messageGroups'
import { useTranscriptScroll } from './useTranscriptScroll'

export type MessageListHandle = {
  /** @returns false when the message is not part of the loaded window. */
  scrollToMessage: (envelopeId: string) => boolean
}

export type MessageListProps = {
  /** Newest first, the order the store keeps them in. */
  messages: MessageRecord[]
  /** True while the conversation or an older page is being read. */
  loading: boolean
  /** True while the server may still hold messages older than the oldest shown. */
  hasOlder: boolean
  onLoadOlder: () => void
  /** Set in group chats, where somebody else's message needs a name above it. */
  senderNames: Map<string, string>
  selfAccountId: string
  language: string
  /**
   * The server timestamp everybody else has read up to, or `0` when not
   * everybody has. One number per conversation, because a tick can only be
   * drawn once every participant is past it.
   */
  readWatermark: number
  highlightedId: string | null
  onMessageMenu: (message: MessageRecord, x: number, y: number) => void
  onToggleReaction: (message: MessageRecord, emoji: string) => void
  onOpenAttachment: (url: string, mime: AttachmentMime) => void
  ref?: Ref<MessageListHandle>
}

/**
 * The scrolling transcript.
 *
 * Rendering only: which day a message belongs to, and where the scroll sits, are
 * `messageGroups.ts` and `useTranscriptScroll.ts`. This is the one place that
 * knows the two together — the day sections are what the anchoring compares, so
 * the day groups are computed here and handed to both.
 *
 * The list is deliberately *not* windowed. Every message needs a real node: the
 * anchoring measures them, and jumping to a search hit or a pinned message looks
 * one up by id. Paging already bounds how much arrives at once, and the cost of
 * the choice — a very long scroll-back grows the DOM — is recorded in
 * README_KNOWN_ISSUES.md.
 */
export function MessageList({
  messages,
  loading,
  hasOlder,
  onLoadOlder,
  senderNames,
  selfAccountId,
  language,
  readWatermark,
  highlightedId,
  onMessageMenu,
  onToggleReaction,
  onOpenAttachment,
  ref,
}: MessageListProps) {
  const { t } = useTranslation()

  // Oldest first, so the DOM order is the reading order.
  const chronological = useMemo(() => [...messages].reverse(), [messages])
  const labels = useMemo(() => ({ today: t('chat.today'), yesterday: t('chat.yesterday') }), [t])
  const groups = useMemo(
    () => groupByDay(chronological, language, labels),
    [chronological, language, labels],
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const scroll = useTranscriptScroll(containerRef, {
    firstId: chronological.at(0)?.envelopeId ?? null,
    lastId: chronological.at(-1)?.envelopeId ?? null,
    revision: groups,
    active: messages.length > 0,
    loading,
    hasOlder,
    onLoadOlder,
  })

  useImperativeHandle(ref, () => ({ scrollToMessage: scroll.scrollToMessage }), [scroll])

  if (messages.length === 0) {
    if (loading) {
      return <MessageListSkeleton />
    }
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <EmptyState icon={MessageSquare} title={t('chat.empty')} description={t('chat.emptyHint')} />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={containerRef}
        onScroll={scroll.handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3"
      >
        {/* `justify-end` through a full-height wrapper: a conversation that does
            not fill the viewport should rest on the composer, the way every
            messenger shows it, rather than float at the top. */}
        <div className="flex min-h-full flex-col justify-end">
          {hasOlder ? (
            <div className="flex justify-center py-2">
              {loading ? <Spinner className="size-4 text-fg-muted" /> : null}
            </div>
          ) : null}

          {groups.map((group) => (
            <MessageDayGroup
              key={group.key}
              group={group}
              selfAccountId={selfAccountId}
              senderNames={senderNames}
              language={language}
              readWatermark={readWatermark}
              highlightedId={highlightedId}
              onMessageMenu={onMessageMenu}
              onToggleReaction={onToggleReaction}
              onOpenAttachment={onOpenAttachment}
              registerNode={scroll.registerNode}
            />
          ))}
        </div>
      </div>

      {scroll.showJump ? (
        <button
          type="button"
          aria-label={t('chat.scrollToBottom')}
          title={t('chat.scrollToBottom')}
          onClick={scroll.scrollToBottom}
          className={cn(
            'absolute right-4 bottom-4 z-20 flex size-10 cursor-pointer items-center justify-center rounded-full border border-border bg-bg-elevated text-fg shadow-lg',
            'transition-colors duration-150 hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          )}
        >
          <ArrowDown className="size-5" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
