import { BellRing } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ensurePushRegistered, subscribeToPush, type PushOutcome } from '../../pwa/push'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import { useActiveAccount } from '../../hooks/useActiveAccount'
import type { TFunction } from 'i18next'
import {
  readNotificationPrefs,
  writeNotificationPrefs,
  type NotificationPrefs,
} from '../../storage/app_settings'
import type { Account } from '../../types'
import { NOTIFICATION_SOUNDS, playNotificationSound } from '../../utils/notificationSound'
import { Button } from '../ui/Button'
import { PanelSkeleton } from './PanelSkeleton'
import { SettingsCard, SettingsChoice, SettingsRow, SettingsToggle } from './Section'

/** Message sounds: whether one plays, and which. */
export function SoundPanel({ account }: { account: Account }) {
  const { t } = useTranslation()
  const fail = useActionReporter('notifications')

  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)

  useEffect(() => {
    let cancelled = false
    void readNotificationPrefs(account.id).then((value) => {
      if (!cancelled) {
        setPrefs(value)
      }
    })
    return () => {
      cancelled = true
    }
  }, [account.id])

  function apply(next: NotificationPrefs): void {
    setPrefs(next)
    // Fire-and-forget: a preference must never make a click fail, and the screen
    // already shows the new value.
    void writeNotificationPrefs(account.id, next).catch((error: unknown) => {
      console.error('[notifications] the preference could not be saved', error)
      fail(error)
    })
  }

  if (prefs === null) {
    return (
      <SettingsCard title={t('settings.notifications.sound')}>
        <PanelSkeleton />
      </SettingsCard>
    )
  }

  return (
    <SettingsCard title={t('settings.notifications.sound')} description={t('settings.notifications.soundHint')}>
      <SettingsRow label={t('settings.notifications.soundEnabled')}>
        <SettingsToggle
          label={t('settings.notifications.soundEnabled')}
          checked={prefs.enabled}
          onChange={(enabled) => {
            apply({ ...prefs, enabled })
            if (enabled) {
              playNotificationSound(prefs.sound)
            }
          }}
        />
      </SettingsRow>

      <div className="border-t border-border pt-3">
        <SettingsChoice
          label={t('settings.notifications.sound')}
          value={prefs.sound}
          disabled={!prefs.enabled}
          onChange={(sound) => {
            apply({ ...prefs, sound })
            // Played on choice, because a name alone says nothing about a sound.
            playNotificationSound(sound)
          }}
          options={NOTIFICATION_SOUNDS.map((sound) => ({
            value: sound,
            label: t(`settings.notifications.sounds.${sound}`),
          }))}
        />
      </div>
    </SettingsCard>
  )
}

/** The browser's permission for system notifications, and the button to ask. */
export function PushPanel() {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('push')
  const account = useActiveAccount()

  // Read once, lazily: the permission can only change through this screen or the
  // browser's own settings, and re-reading it on every render buys nothing.
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    supported() ? Notification.permission : 'unsupported',
  )
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<PushOutcome | null>(null)

  async function enable(): Promise<void> {
    if (account === null) {
      return
    }
    setBusy(true)
    try {
      const result = await subscribeToPush(account)
      setOutcome(result)
      setPermission(Notification.permission)

      if (result.kind === 'disabled') {
        toast.notify({ kind: 'info', message: t('settings.notifications.disabled') })
      } else if (result.kind === 'denied') {
        toast.notify({ kind: 'info', message: t('settings.notifications.denied') })
      } else if (result.kind === 'failed') {
        toast.notify({ kind: 'error', message: result.reason })
      } else if (result.kind === 'subscribed') {
        toast.notify({ kind: 'success', message: t('settings.notifications.subscribed') })
      }
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  /**
   * Re-registers an existing subscription without asking for anything.
   *
   * The browser's subscription outlives a sign-out, so this is the way to hand
   * it to the server again — and the only way to find out whether the server has
   * a VAPID key, which is why it reports the same outcomes as enabling.
   */
  async function reRegister(): Promise<void> {
    if (account === null) {
      return
    }
    setBusy(true)
    try {
      const result = await ensurePushRegistered(account)
      setOutcome(result)
      if (result.kind === 'disabled') {
        toast.notify({ kind: 'info', message: t('settings.notifications.disabled') })
      } else if (result.kind === 'subscribed') {
        toast.notify({ kind: 'success', message: t('settings.notifications.subscribed') })
      } else if (result.kind === 'failed') {
        toast.notify({ kind: 'error', message: result.reason })
      }
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsCard title={t('settings.notifications.push')} description={t('settings.notifications.pushHint')}>
      <SettingsRow label={t('settings.notifications.permission')} description={stateText(permission, outcome, t)}>
        {permission === 'default' ? (
          <Button
            size="sm"
            loading={busy}
            disabled={account === null}
            onClick={() => {
              void enable()
            }}
          >
            <BellRing className="size-4" aria-hidden />
            {t('settings.notifications.ask')}
          </Button>
        ) : permission === 'granted' ? (
          <Button
            variant="secondary"
            size="sm"
            loading={busy}
            disabled={account === null}
            onClick={() => {
              void reRegister()
            }}
          >
            {t('settings.notifications.reRegister')}
          </Button>
        ) : null}
      </SettingsRow>
    </SettingsCard>
  )
}

function supported(): boolean {
  return typeof Notification !== 'undefined'
}

/** The permission, and what the last attempt at using it produced. */
function stateText(
  permission: NotificationPermission | 'unsupported',
  outcome: PushOutcome | null,
  t: TFunction,
): string {
  if (outcome?.kind === 'disabled') {
    return t('settings.notifications.disabled')
  }
  if (outcome?.kind === 'subscribed') {
    return t('settings.notifications.subscribed')
  }

  switch (permission) {
    case 'granted':
      return t('settings.notifications.granted')
    case 'denied':
      return t('settings.notifications.denied')
    case 'unsupported':
      return t('settings.notifications.unsupported')
    default:
      return t('settings.notifications.prompt')
  }
}
