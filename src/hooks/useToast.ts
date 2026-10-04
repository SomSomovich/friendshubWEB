import { useMemo } from 'react'
import { useToastStore, type ToastInput } from '../state/toastStore'

export type ToastApi = {
  /** Shows a notification and returns its id. */
  notify: (input: ToastInput) => string
  dismiss: (id: string) => void
}

export function useToast(): ToastApi {
  const push = useToastStore((state) => state.push)
  const dismiss = useToastStore((state) => state.dismiss)

  return useMemo(() => ({ notify: push, dismiss }), [push, dismiss])
}
