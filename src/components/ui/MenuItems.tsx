import { useEffect, useRef } from 'react'
import { cn } from '../../utils/cn'
import type { DropdownItem } from './DropdownMenu'

export type MenuItemsProps = {
  items: DropdownItem[]
  /** Called after an item runs, and on Escape — the caller closes itself. */
  onDone: () => void
  className?: string
}

/**
 * The list inside a menu, shared by the dropdown and the context menu.
 *
 * Owning the keyboard handling here means both behave the same: the first item
 * takes focus, arrows move between enabled items, and Escape is the caller's cue
 * to close and restore focus.
 */
export function MenuItems({ items, onDone, className }: MenuItemsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    const firstEnabled = refs.current.find((item) => item !== null && !item.disabled)
    firstEnabled?.focus()
  }, [])

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
    const enabled = refs.current.filter(
      (item): item is HTMLButtonElement => item !== null && !item.disabled,
    )
    if (enabled.length === 0) {
      return
    }
    const currentIndex = enabled.findIndex((item) => item === document.activeElement)
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
      {items.map((item, index) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            ref={(element) => {
              refs.current[index] = element
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
