import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from './useToast'

/**
 * The one-line failure handler for a screen's actions.
 *
 * An API error already carries the server's message, which is more specific than
 * anything invented here, so it is shown verbatim and the translated fallback
 * only covers the cases where the error says nothing useful (a bare `Error`, a
 * thrown string).
 */
export function useActionReporter(scope: string): (cause: unknown) => void {
  const { t } = useTranslation()
  const toast = useToast()

  return useCallback(
    (cause: unknown) => {
      const message = cause instanceof Error ? cause.message : String(cause)
      console.error(`[${scope}] an action failed`, cause)
      toast.notify({
        kind: 'error',
        message: message.length > 0 ? message : t('settings.actionFailed'),
      })
    },
    [scope, t, toast],
  )
}
