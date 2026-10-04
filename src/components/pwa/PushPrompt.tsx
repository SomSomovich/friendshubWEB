import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { subscribeToPush } from '../../pwa/push'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useActiveAccount } from '../../hooks/useActiveAccount'
import { useToast } from '../../hooks/useToast'
import { readPreference, writePreference } from '../../utils/browserStorage'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

/** Asked once per browser, whatever the answer. */
const ASKED_KEY = 'fh.pushPromptShown'

/**
 * The one-time explanation in front of the browser's permission dialog.
 *
 * Browsers only allow that dialog to be opened from a gesture, and only once
 * before they start refusing it, so it is worth a screen of its own rather than
 * a prompt that appears out of nowhere the first time a message arrives.
 */
export function PushPrompt() {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('push')
  const account = useActiveAccount()

  const [answered, setAnswered] = useState(false)
  const [busy, setBusy] = useState(false)

  const accountId = account?.id ?? null

  // Derived rather than pushed into state by an effect: whether the question is
  // still worth asking is a fact about this render, not an event.
  const open =
    !answered &&
    accountId !== null &&
    typeof Notification !== 'undefined' &&
    // Nothing to ask for where the browser cannot show one, or where the answer
    // has already been given — by this screen or by the browser's own settings.
    Notification.permission === 'default' &&
    readPreference(ASKED_KEY) === null

  function close(): void {
    writePreference(ASKED_KEY, '1')
    setAnswered(true)
  }

  async function allow(): Promise<void> {
    if (accountId === null) {
      return
    }
    setBusy(true)
    try {
      const outcome = await subscribeToPush(accountId)
      close()

      if (outcome.kind === 'no-key') {
        toast.notify({ kind: 'info', message: t('pwa.push.noKey') })
      } else if (outcome.kind === 'denied') {
        toast.notify({ kind: 'info', message: t('pwa.push.denied') })
      } else if (outcome.kind === 'failed') {
        toast.notify({ kind: 'error', message: outcome.reason })
      }
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('pwa.push.title')}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t('pwa.push.later')}
          </Button>
          <Button
            loading={busy}
            onClick={() => {
              void allow()
            }}
          >
            {t('pwa.push.allow')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-pretty text-fg-muted">{t('pwa.push.body')}</p>
    </Modal>
  )
}
