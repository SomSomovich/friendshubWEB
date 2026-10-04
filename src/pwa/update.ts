import { i18n } from '../i18n/index'
import { useToastStore } from '../state/toastStore'

/**
 * Tells the reader that a new version has taken over.
 *
 * A toast rather than an automatic reload: the worker is configured to activate
 * immediately, so at this point the page is running the previous release's
 * assets against the new worker, and reloading mid-sentence would lose whatever
 * was being typed.
 */
export function notifyUpdateReady(): void {
  useToastStore.getState().push({
    kind: 'info',
    message: i18n.t('pwa.update.ready'),
    actionLabel: i18n.t('pwa.update.action'),
    onAction: () => {
      window.location.reload()
    },
    // Long enough to be read and acted on, short enough not to sit there all
    // evening announcing something that has already happened.
    timeoutMs: 60_000,
  })
}
