import { ChevronLeft, ChevronRight, Pin, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MessageRecord } from '../../storage/db'

export type PinnedBannerProps = {
  /** Oldest pin first, the order the storage layer keeps. */
  pins: MessageRecord[]
  /** The sender's name, or "Вы" for this account's own messages. */
  senderNameFor: (message: MessageRecord) => string
  /** Which pin is on screen. */
  index: number
  onSelect: (index: number) => void
  onJump: (message: MessageRecord) => void
  /** Hides the banner in this conversation; remembered locally. */
  onHide: () => void
}

/**
 * The strip under the header that cycles through pinned messages.
 *
 * Pinning is local, so this is the only place a pin is ever visible — without
 * the banner, pinned messages would be a setting with no effect.
 */
export function PinnedBanner({
  pins,
  senderNameFor,
  index,
  onSelect,
  onJump,
  onHide,
}: PinnedBannerProps) {
  const { t } = useTranslation()
  const current = pins[index]
  if (current === undefined) {
    return null
  }

  function step(delta: number): void {
    onSelect((index + delta + pins.length) % pins.length)
  }

  return (
    <div className="flex items-center gap-1 border-b border-border bg-bg-elevated px-2 py-1.5">
      <Pin className="size-4 shrink-0 text-accent" aria-hidden />

      <button
        type="button"
        onClick={() => {
          onJump(current)
        }}
        className="flex min-w-0 flex-1 cursor-pointer flex-col items-start rounded-md px-1 py-0.5 text-left hover:bg-bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <span className="text-[11px] font-medium text-accent">{senderNameFor(current)}</span>
        <span className="w-full truncate text-xs text-fg-muted">
          {current.plaintext ?? t('chat.undecryptable')}
        </span>
      </button>

      {pins.length > 1 ? (
        <>
          <span className="shrink-0 text-[11px] text-fg-muted tabular-nums">
            {index + 1}/{pins.length}
          </span>
          <button
            type="button"
            aria-label={t('chat.pinned.previous')}
            onClick={() => {
              step(-1)
            }}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t('chat.pinned.next')}
            onClick={() => {
              step(1)
            }}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </>
      ) : null}

      <button
        type="button"
        aria-label={t('chat.pinned.hide')}
        title={t('chat.pinned.hide')}
        onClick={onHide}
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
