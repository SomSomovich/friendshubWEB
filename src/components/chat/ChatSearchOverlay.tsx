import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatSearch } from '../../hooks/useChatSearch'
import type { MessageRecord } from '../../storage/db'
import { formatFullTimestamp } from '../../utils/chatTime'
import { cn } from '../../utils/cn'
import { PanelSkeleton } from '../settings/PanelSkeleton'

export type ChatSearchOverlayProps = {
  search: ChatSearch
  /** Scrolls the transcript to a hit; the caller owns the highlight. */
  onJump: (message: MessageRecord) => void
  onClose: () => void
  senderNameFor: (message: MessageRecord) => string
  language: string
}

/**
 * Search over the open conversation.
 *
 * A panel rather than a full screen: the hits are only meaningful next to the
 * transcript they came from, and every jump has to be visible behind it.
 */
export function ChatSearchOverlay({
  search,
  onJump,
  onClose,
  senderNameFor,
  language,
}: ChatSearchOverlayProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const hasQuery = search.query.trim().length > 0
  const position = search.results.length === 0 ? 0 : search.index + 1

  /** Steps through the hits and lands on the one stepped to, wrapping around. */
  function jump(delta: number): void {
    const { results, index } = search
    if (results.length === 0) {
      return
    }
    const from = index < 0 ? 0 : index
    const nextIndex = (from + delta + results.length) % results.length
    search.select(nextIndex)

    const target = results.at(nextIndex)
    if (target !== undefined) {
      onJump(target)
    }
  }

  return (
    <div
      className="absolute inset-x-0 top-0 z-30 flex max-h-[70%] flex-col border-b border-border bg-bg-elevated shadow-lg"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <div className="flex items-center gap-1 border-b border-border p-2">
        <Search className="ml-1 size-4 shrink-0 text-fg-muted" aria-hidden />

        <input
          ref={inputRef}
          type="search"
          value={search.query}
          onChange={(event) => {
            search.setQuery(event.target.value)
          }}
          placeholder={t('chat.search.placeholder')}
          aria-label={t('chat.search.placeholder')}
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />

        {hasQuery ? (
          <span
            className="shrink-0 text-xs text-fg-muted tabular-nums"
            aria-live="polite"
            aria-label={t('chat.search.position', { position, total: search.results.length })}
          >
            {position}/{search.results.length}
          </span>
        ) : null}

        <NavButton
          label={t('chat.search.previous')}
          disabled={search.results.length === 0}
          onClick={() => {
            jump(-1)
          }}
          icon={<ChevronUp className="size-4" aria-hidden />}
        />
        <NavButton
          label={t('chat.search.next')}
          disabled={search.results.length === 0}
          onClick={() => {
            jump(1)
          }}
          icon={<ChevronDown className="size-4" aria-hidden />}
        />
        <NavButton
          label={t('common.close')}
          onClick={onClose}
          icon={<X className="size-4" aria-hidden />}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!hasQuery ? (
          <p className="px-4 py-6 text-center text-xs text-fg-muted">{t('chat.search.hint')}</p>
        ) : search.searching ? (
          <PanelSkeleton rows={3} />
        ) : search.results.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-fg-muted">{t('chat.search.empty')}</p>
        ) : (
          <ul>
            {search.results.map((message, resultIndex) => (
              <li key={message.envelopeId}>
                <button
                  type="button"
                  aria-current={resultIndex === search.index ? 'true' : undefined}
                  onClick={() => {
                    search.select(resultIndex)
                    onJump(message)
                    onClose()
                  }}
                  className={cn(
                    'flex w-full cursor-pointer flex-col gap-0.5 px-3 py-2 text-left transition-colors duration-150',
                    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
                    resultIndex === search.index ? 'bg-bg-hover' : 'hover:bg-bg-hover',
                  )}
                >
                  <span className="flex items-center gap-2 text-[11px] text-fg-muted">
                    <span className="truncate font-medium">{senderNameFor(message)}</span>
                    <span className="ml-auto shrink-0 tabular-nums">
                      {formatFullTimestamp(message.clientTimestamp, language)}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-sm text-fg">
                    {message.plaintext ?? t('chat.undecryptable')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function NavButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled === true}
      onClick={onClick}
      className={cn(
        'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted',
        'hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
      )}
    >
      {icon}
    </button>
  )
}
