import { BellRing } from 'lucide-react'
import type { ParseKeys } from 'i18next'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useActionReporter } from '../../hooks/useActionReporter'
import {
  readNotificationPrefs,
  writeNotificationPrefs,
  type NotificationPrefs,
} from '../../storage/app_settings'
import type { Account } from '../../types'
import { NOTIFICATION_SOUNDS, playNotificationSound } from '../../utils/notificationSound'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
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
        <div className="flex justify-center py-4">
          <Spinner className="size-4 text-fg-muted" />
        </div>
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
  const fail = useActionReporter('notifications')

  // Read once, lazily: the permission can only change through this screen or the
  // browser's own settings, and re-reading it on every render buys nothing.
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    supported() ? Notification.permission : 'unsupported',
  )
  const [busy, setBusy] = useState(false)

  async function request(): Promise<void> {
    setBusy(true)
    try {
      setPermission(await Notification.requestPermission())
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsCard title={t('settings.notifications.push')} description={t('settings.notifications.pushHint')}>
      <SettingsRow label={t('settings.notifications.permission')} description={describe(permission, t)}>
        {permission === 'default' ? (
          <Button
            size="sm"
            loading={busy}
            onClick={() => {
              void request()
            }}
          >
            <BellRing className="size-4" aria-hidden />
            {t('settings.notifications.ask')}
          </Button>
        ) : null}
      </SettingsRow>
    </SettingsCard>
  )
}

function supported(): boolean {
  return typeof Notification !== 'undefined'
}

/** Every state a permission can be in, in words rather than as a raw string. */
function describe(
  permission: NotificationPermission | 'unsupported',
  t: (key: ParseKeys) => string,
): string {
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
