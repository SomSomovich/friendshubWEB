import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from './useToast'

/**
 * Copying to the system clipboard, with the one confirmation every caller wants.
 *
 * `navigator.clipboard` needs a secure context and a user gesture and can still
 * reject; the failure is reported rather than swallowed, because a copy that
 * silently did nothing is worse than one that says it failed.
 */
export function useCopy(): (text: string) => Promise<boolean> {
  const { t } = useTranslation()
  const toast = useToast()

  return useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        toast.notify({ kind: 'success', message: t('common.copied') })
        return true
      } catch (error) {
        console.error('[clipboard] the copy failed', error)
        toast.notify({ kind: 'error', message: t('common.copyFailed') })
        return false
      }
    },
    [t, toast],
  )
}
