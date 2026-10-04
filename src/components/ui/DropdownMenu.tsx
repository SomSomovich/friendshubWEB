import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../utils/cn'
import { MenuItems } from './MenuItems'

export type DropdownItem = {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  /** Destructive entries get the danger colour. */
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
 * A menu button. The list itself — and its keyboard behaviour — comes from
 * `MenuItems`, so it cannot drift from the context menu's.
 *
 * The trigger is a real `button` rendered here, so callers pass its content
 * rather than their own button element: nesting buttons is invalid HTML and
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

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
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
          className={cn('absolute top-full z-50 mt-1', align === 'end' ? 'right-0' : 'left-0')}
        >
          <MenuItems
            items={items}
            onDone={() => {
              setOpen(false)
              triggerRef.current?.focus()
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
