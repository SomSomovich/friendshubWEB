import { create } from 'zustand'

/**
 * The notification stack.
 *
 * A store rather than context: toasts are raised from event handlers, effects and
 * non-React code (the WebSocket layer), and none of those can wait for a
 * provider. Messages are already-translated strings — a toast lives for seconds,
 * so it never has to re-translate on a language switch.
 */

export type ToastKind = 'info' | 'success' | 'error'

export type Toast = {
  id: string
  kind: ToastKind
  message: string
  actionLabel: string | null
  onAction: (() => void) | null
  /** Milliseconds until it dismisses itself. */
  timeoutMs: number
}

export type ToastInput = {
  kind?: ToastKind
  message: string
  actionLabel?: string
  onAction?: () => void
  timeoutMs?: number
}

export type ToastState = {
  toasts: Toast[]
  push: (input: ToastInput) => string
  dismiss: (id: string) => void
}

/** Errors get longer: they usually need reading, and often acting on. */
const DEFAULT_TIMEOUT_MS: Record<ToastKind, number> = {
  info: 5_000,
  success: 4_000,
  error: 8_000,
}

/** Beyond three, the stack covers the screen and starts overlapping the composer. */
const MAX_VISIBLE = 3

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (input) => {
    const kind = input.kind ?? 'info'
    const toast: Toast = {
      id: crypto.randomUUID(),
      kind,
      message: input.message,
      actionLabel: input.actionLabel ?? null,
      onAction: input.onAction ?? null,
      timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS[kind],
    }

    set({ toasts: [...get().toasts, toast].slice(-MAX_VISIBLE) })
    return toast.id
  },

  dismiss: (id) => {
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) })
  },
}))
