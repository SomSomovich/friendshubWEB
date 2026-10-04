import { useRef, type TouchEventHandler } from 'react'

/** How long a touch has to rest before it counts as a long press. */
const DEFAULT_DELAY_MS = 500

export type LongPressHandlers = {
  onTouchStart: TouchEventHandler
  onTouchEnd: TouchEventHandler
  onTouchMove: TouchEventHandler
  onTouchCancel: TouchEventHandler
}

/**
 * Long press for touch, where there is no right click.
 *
 * Moving a finger cancels it — otherwise scrolling a list would open a context
 * menu on whatever row the finger happened to start on.
 */
export function useLongPress(
  onLongPress: (x: number, y: number) => void,
  delayMs: number = DEFAULT_DELAY_MS,
): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function cancel(): void {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  return {
    onTouchStart: (event) => {
      const touch = event.touches.item(0)
      if (touch === null) {
        return
      }
      const { clientX, clientY } = touch
      cancel()
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        onLongPress(clientX, clientY)
      }, delayMs)
    },
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onTouchCancel: cancel,
  }
}
