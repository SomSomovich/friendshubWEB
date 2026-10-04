import { useId, useState, type ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type TooltipProps = {
  label: string
  children: ReactNode
  /** Which side the bubble appears on. */
  side?: 'top' | 'bottom'
  className?: string
}

/**
 * Hover and focus only.
 *
 * On touch devices there is no hover, and a tooltip that needs a long-press would
 * compete with the context menus — so nothing is shown there, and every trigger
 * this is used with carries its own accessible label.
 */
export function Tooltip({ label, children, side = 'top', className }: TooltipProps) {
  const id = useId()
  const [visible, setVisible] = useState(false)

  return (
    <span
      className={cn('relative inline-flex', className)}
      onPointerEnter={(event) => {
        // `pointerenter` also fires for touch; only a mouse has hover.
        if (event.pointerType === 'mouse') {
          setVisible(true)
        }
      }}
      onPointerLeave={() => {
        setVisible(false)
      }}
      onFocus={() => {
        setVisible(true)
      }}
      onBlur={() => {
        setVisible(false)
      }}
    >
      <span aria-describedby={visible ? id : undefined} className="inline-flex">
        {children}
      </span>

      {visible ? (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-md border border-border bg-bg-elevated px-2 py-1 text-xs whitespace-nowrap text-fg shadow-sm',
            'animate-fh-fade',
            side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  )
}
