import type { LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../utils/cn'

export type DropdownItem = {
  id: string
  label: string
  icon?: LucideIcon
  /** Destructive entries get the danger colour and are separated. */
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}

export type DropdownMenuProps = {
  /** Rendered inside the trigger button — an icon, usually, not a button. */
  trigger: React.ReactNode
  /** Accessible name for the trigger; the trigger itself carries no text. */
  triggerLabel: string
  items: DropdownItem[]
  align?: 'start' | 'end'
  className?: string
}

/**
 * A menu button with the keyboard behaviour a menu is expected to have: the
 * first item takes focus when it opens, arrows move, Escape closes, and focus
 * returns to the trigger afterwards.
 *
 * The trigger is a real `button` rendered here, so callers pass its content
 * rather than their own button element — nesting buttons is invalid HTML and
 * breaks the keyboard handling of both.
 */
export function DropdownMenu({
  trigger,
  triggerLabel,
  items,
  align = 'end',
  className,
}: DropdownMenuProps) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: PointerEvent): void {
      if (containerRef.current !== null && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
        return
      }

      event.preventDefault()
      const enabled = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null && !item.disabled)
      if (enabled.length === 0) {
        return
      }
      const currentIndex = enabled.findIndex((item) => item === document.activeElement)
      const step = event.key === 'ArrowDown' ? 1 : -1
      const nextIndex = (currentIndex + step + enabled.length) % enabled.length
      enabled[nextIndex]?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    itemRefs.current.find((item) => item !== null && !item.disabled)?.focus()

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpen((value) => !value)
        }}
        className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {trigger}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'animate-fh-pop absolute top-full z-50 mt-1 min-w-48 overflow-hidden rounded-xl border border-border bg-bg-elevated py-1 shadow-lg',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, index) => (
            <MenuEntry
              key={item.id}
              item={item}
              setRef={(element) => {
                itemRefs.current[index] = element
              }}
              onSelected={() => {
                setOpen(false)
                triggerRef.current?.focus()
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function MenuEntry({
  item,
  setRef,
  onSelected,
}: {
  item: DropdownItem
  setRef: (element: HTMLButtonElement | null) => void
  onSelected: () => void
}) {
  const Icon = item.icon

  return (
    <button
      ref={setRef}
      type="button"
      role="menuitem"
      disabled={item.disabled === true}
      onClick={() => {
        onSelected()
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
}
