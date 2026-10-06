import { useToastStore, type ToastKind } from '../state/toastStore'

/**
 * A toast raised from the call layer.
 *
 * The call is driven by event handlers and socket frames rather than by React,
 * and a toast stack is a store for exactly that reason — but every call site
 * still had to reach for `useToastStore.getState()` itself. One named function
 * keeps the call layer's vocabulary about calls rather than about stores.
 */
export function notifyCall(kind: ToastKind, message: string): void {
  useToastStore.getState().push({ kind, message })
}
