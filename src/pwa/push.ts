import type { AccountAuth } from '../api/auth'
import { del, get, post } from '../api/client'
import { setSetting } from '../storage/settings'
import { asBinaryPayload } from '../utils/bytes'
import { readEnvVar } from '../utils/env'

/**
 * Web Push (API_FRONTEND.txt §26).
 *
 * The payload is a wake-up and nothing else: no text, no sender, no
 * conversation. The service worker shows a generic notification and the app
 * fetches the envelopes over its own socket, which is what keeps the message
 * content out of the push service entirely.
 *
 * The subscription is per device, so it is stored on the server against
 * (account, device) — the same device that has to be woken.
 */

/** The key is asked for once per page: it does not change while the tab lives. */
let cachedKey: string | null | undefined

export type PushOutcome =
  /** A subscription exists and the server has it. */
  | { kind: 'subscribed' }
  | { kind: 'denied' }
  | { kind: 'unsupported' }
  /** The server has no VAPID key configured; push is off, and that is not an error. */
  | { kind: 'disabled' }
  | { kind: 'failed'; reason: string }

function subscriptionKey(accountId: string): string {
  return `push_subscription:${accountId}`
}

/**
 * The server's public VAPID key, or `null` when it has none.
 *
 * A 404 means push is not configured on this deployment — a state to report,
 * not to fail on. `VITE_VAPID_PUBLIC_KEY` is still honoured as a fallback, for
 * a build that talks to a server which has not grown the endpoint yet.
 */
export async function fetchVapidKey(account: AccountAuth): Promise<string | null> {
  if (cachedKey !== undefined) {
    return cachedKey
  }

  try {
    const response = await get<{ publicKey: string }>('/push/vapid', { account })
    cachedKey = response.publicKey.length > 0 ? response.publicKey : null
  } catch (error) {
    console.warn('[push] the server has no VAPID key', error)
    const fallback = readEnvVar('VITE_VAPID_PUBLIC_KEY', '')
    cachedKey = fallback.length > 0 ? fallback : null
  }
  return cachedKey
}

/** Forgets the cached key, so a settings screen can ask again. */
export function forgetVapidKey(): void {
  cachedKey = undefined
}

/**
 * Asks for the permission and registers the subscription with the server.
 *
 * Called on the sign-in path and again whenever the settings screen asks; the
 * browser answers `getSubscription` with the existing one rather than making a
 * second, so repeating it is cheap.
 */
export async function subscribeToPush(account: AccountAuth & { id: string }): Promise<PushOutcome> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { kind: 'unsupported' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { kind: 'denied' }
  }

  const key = await fetchVapidKey(account)
  if (key === null) {
    return { kind: 'disabled' }
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

    await uploadSubscription(account, subscription)
    await rememberEndpoint(account.id, subscription.endpoint)
    return { kind: 'subscribed' }
  } catch (error) {
    console.warn('[push] the subscription failed', error)
    return { kind: 'failed', reason: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Re-registers an existing subscription on a new sign-in.
 *
 * The permission survives a logout, and so does the browser's subscription —
 * dropping it would mean asking again for something the user already allowed.
 */
export async function ensurePushRegistered(
  account: AccountAuth & { id: string },
): Promise<PushOutcome> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { kind: 'unsupported' }
  }
  if (Notification.permission !== 'granted') {
    return { kind: 'denied' }
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription === null) {
      // Permission without a subscription: the browser dropped it, so it has to
      // be made again — and that needs the key.
      return await subscribeToPush(account)
    }

    await uploadSubscription(account, subscription)
    await rememberEndpoint(account.id, subscription.endpoint)
    return { kind: 'subscribed' }
  } catch (error) {
    console.warn('[push] the subscription could not be re-registered', error)
    return { kind: 'failed', reason: error instanceof Error ? error.message : String(error) }
  }
}

/** Tells the server to stop waking this device. */
export async function unsubscribeFromPush(account: AccountAuth & { id: string }): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription === null) {
      return
    }
    await deleteSubscription(account, subscription.endpoint)
    await subscription.unsubscribe()
  } catch (error) {
    // The sign-out must not fail over this; a subscription the server keeps for
    // a device that has left is harmless, and the next sign-in replaces it.
    console.warn('[push] the subscription could not be removed', error)
  }
}

async function uploadSubscription(
  account: AccountAuth,
  subscription: PushSubscription,
): Promise<void> {
  const json = subscription.toJSON()
  await post<void>(
    '/push/subscribe',
    {
      subscription: {
        endpoint: subscription.endpoint,
        keys: { p256dh: json.keys?.['p256dh'] ?? '', auth: json.keys?.['auth'] ?? '' },
      },
      user_agent: navigator.userAgent.slice(0, 512),
    },
    { account },
  )
}

async function deleteSubscription(account: AccountAuth, endpoint: string): Promise<void> {
  await del<void>('/push/subscribe', { endpoint }, { account })
}

/** Remembers which endpoint belongs to this account, for the sign-out. */
async function rememberEndpoint(accountId: string, endpoint: string): Promise<void> {
  await setSetting(subscriptionKey(accountId), endpoint)
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
