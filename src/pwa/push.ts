import { getSetting, setSetting } from '../storage/settings'
import { asBinaryPayload } from '../utils/bytes'
import { readEnvVar } from '../utils/env'

/**
 * Web Push.
 *
 * There is no server endpoint to hand a subscription to — API_FRONTEND.txt has
 * nothing under `/push`, and `/webrtc/ice-servers` is for calls — so a
 * subscription is created and kept locally, ready to upload the moment such an
 * endpoint exists. Until there is one, a granted permission is still worth
 * having: it is what lets the app raise a system notification from the page when
 * a message arrives in a hidden tab.
 */

/** The key VAPID signs with; without it a browser refuses to subscribe at all. */
export function vapidPublicKey(): string | null {
  const key = readEnvVar('VITE_VAPID_PUBLIC_KEY', '')
  return key.length === 0 ? null : key
}

export type PushOutcome =
  /** A subscription exists and has been stored. */
  | { kind: 'subscribed' }
  /** Permission was granted, but this build has no VAPID key to subscribe with. */
  | { kind: 'no-key' }
  | { kind: 'denied' }
  | { kind: 'unsupported' }
  | { kind: 'failed'; reason: string }

function subscriptionKey(accountId: string): string {
  return `push_subscription:${accountId}`
}

export async function subscribeToPush(accountId: string): Promise<PushOutcome> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { kind: 'unsupported' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { kind: 'denied' }
  }

  const key = vapidPublicKey()
  if (key === null) {
    // Honest about the state of things: the permission is real and useful, the
    // push subscription is not available.
    return { kind: 'no-key' }
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        // Every browser requires this now; a subscription that could be used
        // without showing anything is what it exists to prevent.
        userVisibleOnly: true,
        applicationServerKey: asBinaryPayload(urlBase64ToBytes(key)),
      }))

    await setSetting(subscriptionKey(accountId), JSON.stringify(subscription.toJSON()))
    return { kind: 'subscribed' }
  } catch (error) {
    console.warn('[push] the subscription failed', error)
    return { kind: 'failed', reason: error instanceof Error ? error.message : String(error) }
  }
}

/** The stored subscription, as the browser serialised it. */
export async function readStoredSubscription(accountId: string): Promise<string | null> {
  return getSetting(subscriptionKey(accountId))
}

/**
 * A VAPID key is base64url — no padding, `-` and `_` for the last two characters
 * — while `atob` only understands standard base64.
 */
function urlBase64ToBytes(base64: string): Uint8Array {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const standard = padded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(standard)

  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}
