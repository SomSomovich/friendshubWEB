import { Smile } from 'lucide-react'
import type { ParseKeys } from 'i18next'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { EMOJI_CATEGORIES, type EmojiCategoryId } from '../../emoji/catalog'
import { cn } from '../../utils/cn'

/**
 * The emoji picker, opening upwards out of the composer.
 *
 * Two things about it are load-bearing rather than decorative:
 *
 *  - the panel is anchored to the *right* of its trigger, because the trigger
 *    sits beside the microphone at the right edge of the screen and a panel of
 *    this width opening to the right would leave the viewport;
 *  - every glyph carries the `emoji` class, which names the colour fonts before
 *    anything else. Windows reaches Segoe UI Symbol — outlined and monochrome —
 *    before it reaches Segoe UI Emoji, and that is the black outline these
 *    characters arrive with otherwise.
 */

const CATEGORY_LABELS: Record<EmojiCategoryId, ParseKeys> = {
  smileys: 'emoji.categories.smileys',
  emotions: 'emoji.categories.emotions',
  gestures: 'emoji.categories.gestures',
  hearts: 'emoji.categories.hearts',
  animals: 'emoji.categories.animals',
  food: 'emoji.categories.food',
  activity: 'emoji.categories.activity',
  objects: 'emoji.categories.objects',
}

/** Matches the grid's own columns, so Up and Down move a row at a time. */
const COLUMNS = 8

export type EmojiPickerProps = {
  /** One emoji was chosen; the composer decides where it lands. */
  onPick: (emoji: string) => void
  disabled?: boolean
}

export function EmojiPicker({ onPick, disabled = false }: EmojiPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<EmojiCategoryId>('smileys')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: PointerEvent): void {
      const target = event.target
      if (target instanceof Node && containerRef.current?.contains(target) === true) {
        return
      }
      setOpen(false)
    }

    function handleKeyDown(event: globalThis.KeyboardEvent): void {
      if (event.key !== 'Escape') {
        return
      }
      // Caught before it reaches anything else: Escape belongs to the picker
      // while the picker is up.
      event.stopPropagation()
      setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [open])

  /** Arrows walk the grid; the buttons stay ordinary tab stops for everything else. */

  /** Arrows walk the grid; the buttons stay ordinary tab stops for everything else. */
  function moveFocus(event: KeyboardEvent<HTMLDivElement>): void {
    const step =
      event.key === 'ArrowLeft'
        ? -1
        : event.key === 'ArrowRight'
          ? 1
          : event.key === 'ArrowUp'
            ? -COLUMNS
            : event.key === 'ArrowDown'
              ? COLUMNS
              : 0
    if (step === 0) {
      return
    }
    event.preventDefault()

    const buttons = [...event.currentTarget.querySelectorAll('button')]
    const focused = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = buttons[Math.min(Math.max(focused + step, 0), buttons.length - 1)]
    next?.focus()
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={t('emoji.open')}
        title={t('emoji.open')}
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => {
          setOpen((current) => !current)
        }}
        className={cn(
          'flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors duration-150',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open ? 'bg-accent/20 text-accent' : 'text-fg-muted hover:bg-bg-hover hover:text-fg',
        )}
      >
        <Smile className="size-5" aria-hidden />
      </button>

      {!open ? null : (
        <div
          role="dialog"
          aria-label={t('emoji.title')}
          className="animate-fh-pop absolute right-0 bottom-full z-40 mb-2 w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-border bg-bg-elevated shadow-lg"
        >
          <div
            role="tablist"
            aria-label={t('emoji.title')}
            className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border p-2"
          >
            {EMOJI_CATEGORIES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={entry.id === category}
                aria-label={t(CATEGORY_LABELS[entry.id])}
                title={t(CATEGORY_LABELS[entry.id])}
                onClick={() => {
                  setCategory(entry.id)
                }}
                className={cn(
                  'emoji flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-lg leading-none transition-colors duration-150',
                  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
                  entry.id === category ? 'bg-accent/20' : 'hover:bg-bg-hover',
                )}
              >
                {entry.glyph}
              </button>
            ))}
          </div>

          {/* Every section is drawn and all but one is hidden, rather than one
              being looked up: a lookup has to answer for a category that is not
              there, and hiding sidesteps the question entirely. */}
          {EMOJI_CATEGORIES.map((entry) => (
            <div
              key={entry.id}
              hidden={entry.id !== category}
              onKeyDown={moveFocus}
              className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto p-2"
            >
              {entry.emoji.map((glyph) => (
                <button
                  key={glyph}
                  type="button"
                  onClick={() => {
                    onPick(glyph)
                  }}
                  className={cn(
                    'emoji flex size-8 cursor-pointer items-center justify-center rounded-lg text-xl leading-none transition-colors duration-150',
                    'hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
                  )}
                >
                  {glyph}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
