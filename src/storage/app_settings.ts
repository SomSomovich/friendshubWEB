import { isNotificationSound, type NotificationSound } from '../utils/notificationSound'
import { getSetting, setSetting } from './settings'

/**
 * Preferences the server either does not model or does not expose.
 *
 * The notification sound is purely local. The invisibility flag is not: the
 * server stores it, but nothing reads it back — `GET /me` carries the username,
 * the avatar and the custom status, and not this — so the value the toggle shows
 * is a record of what this device last set, not a value read from the account.
 */

const NOTIFICATIONS_ENABLED = 'notifications_enabled'
const NOTIFICATIONS_SOUND = 'notifications_sound'
const INVISIBLE = 'invisible_mode'

/** Default sound id, kept in one place so the reader and the writer agree. */
export const DEFAULT_NOTIFICATION_SOUND: NotificationSound = 'chime'

function key(accountId: string, name: string): string {
  return `${name}:${accountId}`
}

export type NotificationPrefs = {
  /** Whether a sound plays for a message that arrives. */
  enabled: boolean
  sound: NotificationSound
}

export async function readNotificationPrefs(accountId: string): Promise<NotificationPrefs> {
  const [enabled, sound] = await Promise.all([
    getSetting(key(accountId, NOTIFICATIONS_ENABLED)),
    getSetting(key(accountId, NOTIFICATIONS_SOUND)),
  ])

  return {
    // Anything but an explicit "off" means on: a preference nobody has made yet
    // should behave like the default, not like a decision against it.
    enabled: enabled !== 'off',
    sound: isNotificationSound(sound) ? sound : DEFAULT_NOTIFICATION_SOUND,
  }
}

export async function writeNotificationPrefs(
  accountId: string,
  prefs: NotificationPrefs,
): Promise<void> {
  await Promise.all([
    setSetting(key(accountId, NOTIFICATIONS_ENABLED), prefs.enabled ? 'on' : 'off'),
    setSetting(key(accountId, NOTIFICATIONS_SOUND), prefs.sound),
  ])
}

export async function readInvisibleMirror(accountId: string): Promise<boolean> {
  return (await getSetting(key(accountId, INVISIBLE))) === 'on'
}

export async function writeInvisibleMirror(accountId: string, on: boolean): Promise<void> {
  await setSetting(key(accountId, INVISIBLE), on ? 'on' : 'off')
}
