import { useEffect, useRef } from 'react'
import { cn } from '../../utils/cn'
import type { DropdownItem } from './DropdownMenu'

/** One emoji in a menu's reaction strip. */
export type MenuReaction = {
  emoji: string
  /**
   * Accessible name. An emoji character is not something a screen reader can
   * announce usefully, so every one of them carries its own label.
   */
  label: string
  /** True when this account has already reacted with it. */
  active?: boolean
  onSelect: () => void
}

export type MenuItemsProps = {
  items: DropdownItem[]
  /**
   * The reaction strip, rendered above the items and inside the same keyboard
   * order — they are menu entries like any other, not decoration.
   */
  reactions?: MenuReaction[]
  /** Called after an item runs, and on Escape — the caller closes itself. */
  onDone: () => void
  className?: string
}

/**
 * The list inside a menu, shared by the dropdown and the context menu.
 *
 * Owning the keyboard handling here means both behave the same: the first entry
 * takes focus, arrows move between enabled entries, and Escape is the caller's
 * cue to close and restore focus.
 */
export function MenuItems({ items, reactions, onDone, className }: MenuItemsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const reactionCount = reactions?.length ?? 0
  const entryCount = reactionCount + items.length

  useEffect(() => {
    // Sliced to the current entry count: a shorter list rendered into a longer
    // ref array must not hand focus to a button that is no longer on screen.
    const firstEnabled = refs.current
      .slice(0, entryCount)
      .find((entry) => entry !== null && !entry.disabled)
    firstEnabled?.focus()
  }, [entryCount])

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onDone()
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return
    }

    event.preventDefault()
    const enabled = refs.current
      .slice(0, entryCount)
      .filter((entry): entry is HTMLButtonElement => entry !== null && !entry.disabled)
    if (enabled.length === 0) {
      return
    }
    const currentIndex = enabled.findIndex((entry) => entry === document.activeElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    enabled[(currentIndex + step + enabled.length) % enabled.length]?.focus()
  }

  return (
    <div
      role="menu"
      onKeyDown={handleKeyDown}
      className={cn(
        'animate-fh-pop min-w-48 overflow-hidden rounded-xl border border-border bg-bg-elevated py-1 shadow-lg',
        className,
      )}
    >
      {reactions === undefined || reactions.length === 0 ? null : (
        <div className="flex items-center justify-between gap-0.5 border-b border-border px-1.5 pt-1 pb-1.5">
          {reactions.map((reaction, index) => (
            <button
              key={reaction.emoji}
              ref={(element) => {
                refs.current[index] = element
              }}
              type="button"
              role="menuitem"
              aria-label={reaction.label}
              aria-pressed={reaction.active === true}
              onClick={() => {
                onDone()
                reaction.onSelect()
              }}
              className={cn(
                'flex size-8 cursor-pointer items-center justify-center rounded-lg text-lg leading-none transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
                reaction.active === true
                  ? 'bg-accent/25 ring-1 ring-accent'
                  : 'hover:bg-bg-hover',
              )}
            >
              <span aria-hidden>{reaction.emoji}</span>
            </button>
          ))}
        </div>
      )}

      {items.map((item, index) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            ref={(element) => {
              refs.current[reactionCount + index] = element
            }}
            type="button"
            role="menuitem"
            disabled={item.disabled === true}
            onClick={() => {
              onDone()
              item.onSelect()
            }}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              item.danger === true ? 'text-danger hover:bg-danger/10' : 'text-fg hover:bg-bg-hover',
            )}
          >
            {Icon === undefined ? null : <Icon className="size-4 shrink-0" aria-hidden />}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
