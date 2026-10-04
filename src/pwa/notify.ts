import { readNotificationPrefs } from '../storage/app_settings'
import { playNotificationSound } from '../utils/notificationSound'

/**
 * Announcing a message that arrived while the reader was looking elsewhere.
 *
 * The sound preference from the settings screen and the notification permission
 * both land here — without this they would be two switches that change nothing.
 * A notification is raised from the page rather than through Web Push, which is
 * why it only works while the tab is alive: that is the whole difference between
 * this and a push subscription, and there is no server endpoint to subscribe to
 * yet (see `push.ts`).
 */

export type IncomingNotice = {
  accountId: string
  /** The conversation's name, as a person reads it. */
  title: string
  body: string
  /** True when the conversation is muted, which silences the sound but not the badge. */
  muted: boolean
}

export async function announceIncoming(notice: IncomingNotice): Promise<void> {
  if (notice.muted) {
    return
  }

  let prefs
  try {
    prefs = await readNotificationPrefs(notice.accountId)
  } catch (error) {
    console.warn('[notify] the notification preferences could not be read', error)
    return
  }

  if (!prefs.enabled) {
    return
  }
  playNotificationSound(prefs.sound)

  // Only when the tab is in the background: a system banner for a message the
  // reader is already looking at is noise.
  if (!document.hidden || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return
  }

  try {
    const notification = new Notification(notice.title, {
      body: notice.body,
      icon: '/pwa-icons/pwa-192x192.png',
      // One notification per conversation, replaced rather than stacked: ten
      // banners from one busy group is not a notification, it is a flood.
      tag: notice.accountId,
    })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  } catch (error) {
    console.warn('[notify] the notification could not be shown', error)
  }
}
