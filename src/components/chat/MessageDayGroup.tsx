import type { AttachmentMime } from '../../attachments/mime'
import type { MessageRecord } from '../../storage/db'
import { MessageBubble } from './MessageBubble'
import { statusFor, type DayGroup } from './messageGroups'

/**
 * One day of the transcript: its sticky heading, and the bubbles under it.
 *
 * Split out of `MessageList` because the list's own job — anchoring the scroll —
 * is the hard part of that file, and this is the part that has to be read
 * carefully. The heading is `sticky` so the day stays named while it is being
 * read, which is the whole reason the sections exist.
 */
export type MessageDayGroupProps = {
  group: DayGroup
  selfAccountId: string
  senderNames: Map<string, string>
  language: string
  readWatermark: number
  highlightedId: string | null
  onMessageMenu: (message: MessageRecord, x: number, y: number) => void
  onToggleReaction: (message: MessageRecord, emoji: string) => void
  onOpenAttachment: (url: string, mime: AttachmentMime) => void
  registerNode: (envelopeId: string, element: HTMLLIElement | null) => void
}

export function MessageDayGroup({
  group,
  selfAccountId,
  senderNames,
  language,
  readWatermark,
  highlightedId,
  onMessageMenu,
  onToggleReaction,
  onOpenAttachment,
  registerNode,
}: MessageDayGroupProps) {
  return (
    <section aria-labelledby={`day-${group.key}`}>
      <h2 id={`day-${group.key}`} className="sticky top-0 z-10 flex justify-center bg-bg py-2">
        <span className="rounded-full border border-border bg-bg-elevated px-3 py-0.5 text-[11px] font-medium text-fg-muted">
          {group.label}
        </span>
      </h2>

      <ol className="flex flex-col gap-1.5 pb-2">
        {group.messages.map((message) => {
          const own = message.senderAccountId === selfAccountId
          return (
            <MessageBubble
              key={message.envelopeId}
              message={message}
              own={own}
              // A name above the bubble only where it can be somebody else's.
              senderName={own ? null : (senderNames.get(message.senderAccountId) ?? null)}
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
          )
        })}
      </ol>
    </section>
  )
}
