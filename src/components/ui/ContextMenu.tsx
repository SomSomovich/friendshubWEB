import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { DropdownItem } from './DropdownMenu'
import { MenuItems } from './MenuItems'

export type ContextMenuProps = {
  open: boolean
  /** Where the pointer was, in viewport coordinates. */
  x: number
  y: number
  items: DropdownItem[]
  onClose: () => void
}

/** Keeps the menu away from the window edges. */
const EDGE_MARGIN = 8
const ESTIMATED_WIDTH = 200
/** Roughly one item per 40px; enough to decide whether to flip upwards. */
const ESTIMATED_ITEM_HEIGHT = 40

/**
 * The menu that opens where the pointer is — right click on desktop, long press
 * on touch.
 *
 * Positioned in a portal so no ancestor's overflow can clip it, clamped to the
 * viewport so an item is never out of reach, and dismissed by Escape, a click
 * outside, a scroll or a resize.
 */
export function ContextMenu({ open, x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: PointerEvent): void {
      const target = event.target
      if (target instanceof Node && menuRef.current?.contains(target) === true) {
        return
      }
      onClose()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    // A fixed-position menu would drift away from its row, so it closes instead.
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  const height = items.length * ESTIMATED_ITEM_HEIGHT
  const left = Math.max(EDGE_MARGIN, Math.min(x, window.innerWidth - ESTIMATED_WIDTH - EDGE_MARGIN))
  const top = Math.max(EDGE_MARGIN, Math.min(y, window.innerHeight - height - EDGE_MARGIN))

  return createPortal(
    <div ref={menuRef} style={{ left, top }} className="fixed z-[70]">
      <MenuItems items={items} onDone={onClose} />
    </div>,
    document.body,
  )
}
