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
const CONVERSATION_MIRROR = 'conversation_mirror'

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

/**
 * The three group/channel settings the server only ever writes.
 *
 * `POST /groups/{id}/profile` and `POST /channels/{id}/profile` set a handle and
 * nothing returns it; `POST /channels/{id}/public` and
 * `POST /channels/{id}/linked-group` are the same story, and the conversation
 * list carries neither value. So — exactly like the invisibility flag above —
 * the settings screen shows what this device last set and says so on screen,
 * rather than pretending it read the value back.
 *
 * One row per (account, conversation), holding all three: they are written by
 * the same screen and read by the same screen, and three separate rows would
 * only make a partial write possible.
 */
export type ConversationMirror = {
  handle: string | null
  isPublic: boolean | null
  discussionGroupId: string | null
}

const EMPTY_MIRROR: ConversationMirror = {
  handle: null,
  isPublic: null,
  discussionGroupId: null,
}

function mirrorKey(accountId: string, conversationId: string): string {
  return `${CONVERSATION_MIRROR}:${accountId}:${conversationId}`
}

export async function readConversationMirror(
  accountId: string,
  conversationId: string,
): Promise<ConversationMirror> {
  const raw = await getSetting(mirrorKey(accountId, conversationId))
  if (raw === null) {
    return EMPTY_MIRROR
  }

  // Written by this app, but an older build or a hand-edited database is not a
  // reason to throw while opening a settings screen.
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return EMPTY_MIRROR
    }
    const record = parsed as Record<string, unknown>
    return {
      handle: typeof record.handle === 'string' ? record.handle : null,
      isPublic: typeof record.isPublic === 'boolean' ? record.isPublic : null,
      discussionGroupId:
        typeof record.discussionGroupId === 'string' ? record.discussionGroupId : null,
    }
  } catch (error) {
    console.warn('[settings] the conversation mirror could not be parsed', error)
    return EMPTY_MIRROR
  }
}

/** Merges `patch` into what is stored and returns the merged value. */
export async function writeConversationMirror(
  accountId: string,
  conversationId: string,
  patch: Partial<ConversationMirror>,
): Promise<ConversationMirror> {
  const current = await readConversationMirror(accountId, conversationId)
  const next = { ...current, ...patch }
  await setSetting(mirrorKey(accountId, conversationId), JSON.stringify(next))
  return next
}
