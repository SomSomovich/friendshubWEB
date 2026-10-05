import { ArrowDown, MessageSquare } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { AttachmentMime } from '../../attachments/mime'
import type { MessageRecord } from '../../storage/db'
import { dayKey, formatDayLabel } from '../../utils/chatTime'
import { isMessageRead } from '../../utils/readReceipts'
import { cn } from '../../utils/cn'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import { MessageBubble } from './MessageBubble'

export type MessageListHandle = {
  /**
   * Brings a message into view.
   *
   * @returns false when it is not part of the loaded window — the caller can
   *          then say so rather than silently doing nothing.
   */
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

/** How close to the bottom still counts as "following the conversation". */
const BOTTOM_THRESHOLD_PX = 80
/** How close to the top starts loading the previous page. */
const TOP_THRESHOLD_PX = 160

/**
 * The scrolling transcript.
 *
 * Rendered oldest-first so the DOM order matches the reading order — a reversed
 * container would anchor the scroll for free but read a conversation backwards
 * to a screen reader. The anchoring is done by hand instead: prepending older
 * messages compensates the scroll offset, and a message that arrives while the
 * reader is at the bottom follows them down.
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const nodesRef = useRef(new Map<string, HTMLLIElement>())
  /** True while the reader is at the bottom, so new messages may pull them along. */
  const followingRef = useRef(true)
  const loadingOlderRef = useRef(false)
  const jumpRef = useRef(false)
  const previousRef = useRef<{
    first: string | null
    last: string | null
    height: number
    top: number
  } | null>(null)

  const [showJump, setShowJump] = useState(false)

  const chronological = useMemo(() => [...messages].reverse(), [messages])
  const labels = useMemo(
    () => ({ today: t('chat.today'), yesterday: t('chat.yesterday') }),
    [t],
  )
  const groups = useMemo(
    () => groupByDay(chronological, language, labels),
    [chronological, language, labels],
  )

  const firstId = chronological.at(0)?.envelopeId ?? null
  const lastId = chronological.at(-1)?.envelopeId ?? null

  /**
   * Attaches the container and keeps it pinned to the bottom while the reader is
   * following the conversation.
   *
   * The window itself changes height for reasons this component never hears
   * about — the composer appears once the conversation record arrives, a phone
   * rotates, the on-screen keyboard opens — and each of those would otherwise
   * leave the newest message half behind the composer.
   */
  const attachContainer = useCallback((element: HTMLDivElement | null) => {
    scrollRef.current = element
    resizeObserverRef.current?.disconnect()
    resizeObserverRef.current = null
    if (element === null) {
      return
    }

    const observer = new ResizeObserver(() => {
      if (followingRef.current) {
        element.scrollTop = element.scrollHeight
      }
    })
    observer.observe(element)
    resizeObserverRef.current = observer
  }, [])

  useEffect(
    () => () => {
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
    },
    [],
  )

  const requestOlder = useCallback(() => {
    if (loadingOlderRef.current || !hasOlder) {
      return
    }
    loadingOlderRef.current = true
    onLoadOlder()
  }, [hasOlder, onLoadOlder])

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (container === null) {
      return
    }
    const previous = previousRef.current

    // Both ends changed: this is a different conversation (or a jump), not an
    // older page or a new message, and the reader belongs at the newest one.
    const switched = previous === null || (previous.first !== firstId && previous.last !== lastId)

    if (switched) {
      container.scrollTop = container.scrollHeight
      followingRef.current = true
      // The ref has to move with the state, or the next scroll would compare
      // against a value that no longer describes what is on screen.
      jumpRef.current = false
      setShowJump(false)
    } else if (previous.first !== firstId) {
      // Older messages were added above: keep the reader on the same message by
      // compensating exactly the height that appeared above the viewport.
      container.scrollTop = previous.top + (container.scrollHeight - previous.height)
    } else if (previous.last !== lastId && followingRef.current) {
      container.scrollTop = container.scrollHeight
    }

    previousRef.current = {
      first: firstId,
      last: lastId,
      height: container.scrollHeight,
      top: container.scrollTop,
    }
  }, [firstId, lastId, groups])

  // A page that does not fill the viewport cannot be scrolled, so the reader
  // would have to guess that more exists. Loading it unprompted is the fix.
  useLayoutEffect(() => {
    const container = scrollRef.current
    if (container !== null && container.scrollHeight <= container.clientHeight) {
      requestOlder()
    }
  }, [groups, requestOlder])

  useEffect(() => {
    if (!loading) {
      loadingOlderRef.current = false
    }
  }, [loading])

  const scrollToMessage = useCallback((envelopeId: string): boolean => {
    const node = nodesRef.current.get(envelopeId)
    if (node === undefined) {
      return false
    }
    node.scrollIntoView({ block: 'center', behavior: 'smooth' })
    return true
  }, [])

  useImperativeHandle(ref, () => ({ scrollToMessage }), [scrollToMessage])

  const registerNode = useCallback((envelopeId: string, element: HTMLLIElement | null) => {
    if (element === null) {
      nodesRef.current.delete(envelopeId)
      return
    }
    nodesRef.current.set(envelopeId, element)
  }, [])

  function handleScroll(): void {
    const container = scrollRef.current
    if (container === null) {
      return
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    const following = distanceFromBottom < BOTTOM_THRESHOLD_PX
    followingRef.current = following

    // Guarded so a scroll does not re-render the whole transcript per frame.
    if (jumpRef.current === following) {
      jumpRef.current = !following
      setShowJump(!following)
    }

    if (container.scrollTop < TOP_THRESHOLD_PX) {
      requestOlder()
    }
  }

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {loading ? (
          <Spinner className="text-fg-muted" />
        ) : (
          <EmptyState
            icon={MessageSquare}
            title={t('chat.empty')}
            description={t('chat.emptyHint')}
          />
        )}
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={attachContainer}
        onScroll={handleScroll}
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
            <section key={group.key} aria-labelledby={`day-${group.key}`}>
              <h2
                id={`day-${group.key}`}
                className="sticky top-0 z-10 flex justify-center bg-bg py-2"
              >
                <span className="rounded-full border border-border bg-bg-elevated px-3 py-0.5 text-[11px] font-medium text-fg-muted">
                  {group.label}
                </span>
              </h2>

              <ol className="flex flex-col gap-1.5 pb-2">
                {group.messages.map((message) => (
                  <MessageBubble
                    key={message.envelopeId}
                    message={message}
                    own={message.senderAccountId === selfAccountId}
                    senderName={
                      message.senderAccountId === selfAccountId
                        ? null
                        : (senderNames.get(message.senderAccountId) ?? null)
                    }
                    language={language}
                    status={statusFor(message, selfAccountId, readWatermark)}
                    highlighted={message.envelopeId === highlightedId}
                    selfAccountId={selfAccountId}
                    onContextMenu={(x, y) => {
                      onMessageMenu(message, x, y)
                    }}
                    onToggleReaction={(emoji) => {
                      onToggleReaction(message, emoji)
                    }}
                    onOpenAttachment={onOpenAttachment}
                    registerNode={registerNode}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>

      {showJump ? (
        <button
          type="button"
          aria-label={t('chat.scrollToBottom')}
          title={t('chat.scrollToBottom')}
          onClick={() => {
            const container = scrollRef.current
            if (container !== null) {
              container.scrollTop = container.scrollHeight
            }
          }}
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

/**
 * The tick for one message.
 *
 * Only read is computed here — the rest is what the send path recorded, since
 * nothing else knows about it. A message this account did not send never shows
 * a tick at all, and `MessageBubble` only draws one for its own.
 */
function statusFor(
  message: MessageRecord,
  selfAccountId: string,
  readWatermark: number,
): MessageRecord['status'] {
  if (message.senderAccountId === selfAccountId && isMessageRead(message.serverTimestamp, readWatermark)) {
    return 'read'
  }
  return message.status
}

type DayGroup = {
  key: string
  label: string
  messages: MessageRecord[]
}

function groupByDay(
  chronological: MessageRecord[],
  language: string,
  labels: { today: string; yesterday: string },
): DayGroup[] {
  const groups: DayGroup[] = []

  for (const message of chronological) {
    const key = dayKey(message.clientTimestamp)
    const current = groups.at(-1)
    if (current === undefined || current.key !== key) {
      groups.push({
        key,
        label: formatDayLabel(message.clientTimestamp, language, labels),
        messages: [message],
      })
      continue
    }
    current.messages.push(message)
  }

  return groups
}
