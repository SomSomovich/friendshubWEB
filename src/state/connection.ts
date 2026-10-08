import { loadOrInitializeAccount } from '../crypto/account'
import { restoreSnapshot } from '../crypto/snapshot'
import type { Account } from '../types'
import { setActiveClient } from '../ws/activeClient'
import { WsClient } from '../ws/client'
import { attachClientToAccount } from './wsBridge'

/**
 * The lifetime of the one WebSocket the app holds.
 *
 * Only the active account is connected (brief §8), so switching accounts hands
 * the socket over rather than opening a second one. Signing in and reloading the
 * page both end here: without the second path, a reload leaves the app signed in
 * but deaf, and the conversation view would never see a live message.
 *
 * The connection is owned by this module rather than by a component, because its
 * lifetime is longer than any screen's — a message that arrives while the user
 * is in the settings still has to be stored.
 */

/** The slow half (`keys`) is the first sign-in on a device. */
export type ConnectStep = 'keys' | 'socket'

/** The name this browser registers under, wherever a device is registered. */
export const DEVICE_LABEL = 'FriendsHub Web'
/** The first connection's retry delays; the client owns reconnects after that. */
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 30_000]

type ActiveConnection = {
  accountId: string
  client: WsClient
  /** Unsubscribes the store bridge. */
  detach: () => void
  cancelled: boolean
  retryTimer: ReturnType<typeof setTimeout> | null
}

let active: ActiveConnection | null = null
/** Serialises connection attempts, so React's development double-mount cannot open two sockets. */
let inFlight: Promise<void> | null = null
let inFlightAccountId: string | null = null

/** The account whose socket is open or being opened, if any. */
export function connectedAccountId(): string | null {
  return active?.accountId ?? null
}

/**
 * Makes `account` the connected one, preparing this device first.
 *
 * This is the signing-in path: it creates the identity and the prekey pool when
 * this browser has never held the account. Idempotent for the account that
 * already owns the socket, so a screen mounting after a sign-in cannot tear down
 * the connection the sign-in just made.
 */
export function ensureConnected(
  account: Account,
  onStep?: (step: ConnectStep) => void,
): Promise<void> {
  if (isActive(account.id)) {
    return Promise.resolve()
  }

  return connectOnce(account.id, async () => {
    const entry = await beginConnection(account)
    try {
      onStep?.('keys')
      await loadOrInitializeAccount(account, DEVICE_LABEL)
      if (isStale(entry)) {
        return
      }
      onStep?.('socket')
      await connectWithRetry(entry, account, 0)
    } catch (error) {
      // The keys could not be prepared, which is fatal for this attempt:
      // release the slot so signing in again can take it.
      if (active === entry) {
        await abandon(entry)
      }
      throw error
    }
  })
}

/**
 * Reconnects a browser that already holds this account's keys.
 *
 * Deliberately narrower than `ensureConnected` and does nothing when there is no
 * stored state: initialising an account registers a device and uploads a prekey
 * pool, and doing that on every page load would litter the account with devices.
 * A browser that has never held the keys reaches them through the sign-in flow,
 * which is the one place that can show the progress and the failures.
 */
export function resumeConnection(account: Account): Promise<void> {
  if (isActive(account.id)) {
    return Promise.resolve()
  }

  return connectOnce(account.id, async () => {
    if (!(await restoreSnapshot(account.id))) {
      return
    }
    const entry = await beginConnection(account)
    await connectWithRetry(entry, account, 0)
  })
}

/** Closes the socket and releases the slot. Safe to call when nothing is open. */
export async function disconnectConnection(): Promise<void> {
  const entry = active
  active = null
  if (entry === null) {
    return
  }

  entry.cancelled = true
  clearRetry(entry)
  entry.detach()
  setActiveClient(null)

  await entry.client.close()
}

async function beginConnection(account: Account): Promise<ActiveConnection> {
  await disconnectConnection()

  const client = new WsClient()
  const entry: ActiveConnection = {
    accountId: account.id,
    client,
    // Subscribed before connecting: the server hands the backlog over with the
    // handshake, and a subscription made afterwards would miss it.
    detach: attachClientToAccount(client, account),
    cancelled: false,
    retryTimer: null,
  }

  active = entry
  setActiveClient(client)
  return entry
}

async function abandon(entry: ActiveConnection): Promise<void> {
  active = null
  entry.cancelled = true
  clearRetry(entry)
  entry.detach()
  setActiveClient(null)
  await entry.client.close()
}

/**
 * Connects, and keeps retrying in the background while the server is unreachable.
 *
 * A socket that will not open is not a failed sign-in — the app works offline —
 * so this never rejects. Once the handshake succeeds, `WsClient` owns any
 * further reconnection.
 */
async function connectWithRetry(
  entry: ActiveConnection,
  account: Account,
  attempt: number,
): Promise<void> {
  if (isStale(entry)) {
    return
  }

  try {
    await entry.client.connect({
      sessionToken: account.sessionToken,
      deviceNumber: account.deviceNumber,
    })
  } catch (error) {
    if (isStale(entry)) {
      return
    }
    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ?? 30_000
    console.warn(`[state] the socket could not connect; retrying in ${delay} ms`, error)

    entry.retryTimer = setTimeout(() => {
      entry.retryTimer = null
      void connectWithRetry(entry, account, attempt + 1)
    }, delay)
  }
}

function connectOnce(accountId: string, work: () => Promise<void>): Promise<void> {
  if (inFlight !== null && inFlightAccountId === accountId) {
    return inFlight
  }

  const promise = work().finally(() => {
    if (inFlight === promise) {
      inFlight = null
      inFlightAccountId = null
    }
  })
  inFlight = promise
  inFlightAccountId = accountId
  return promise
}

function isActive(accountId: string): boolean {
  return active !== null && active.accountId === accountId && !active.cancelled
}

/** True once another connection has taken the slot, or this one was closed. */
function isStale(entry: ActiveConnection): boolean {
  return entry.cancelled || active !== entry
}

function clearRetry(entry: ActiveConnection): void {
  if (entry.retryTimer !== null) {
    clearTimeout(entry.retryTimer)
    entry.retryTimer = null
  }
}
