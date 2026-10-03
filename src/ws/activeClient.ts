import type { WsClient } from './client'

/**
 * The one open connection, for the one active account.
 *
 * The product model is explicit about this (brief §8): only the active account
 * holds a WebSocket, and switching accounts reuses the same slot. So the crypto
 * layer needs a way to reach "the connection" without every call site threading
 * it through — and a single module-level reference is exactly that model, rather
 * than a shortcut around it.
 */

let activeClient: WsClient | null = null

export function setActiveClient(client: WsClient | null): void {
  activeClient = client
}

/** The active connection, or `null` when no account is connected. */
export function getActiveClientOrNull(): WsClient | null {
  return activeClient
}

/**
 * The active connection, for callers that cannot proceed without one.
 *
 * Throws instead of returning a client that is not connected: a message that
 * cannot be sent must surface, not be queued somewhere invisible.
 */
export function requireActiveClient(): WsClient {
  if (activeClient === null) {
    throw new Error('[ws] no active connection: connect an account before sending')
  }
  return activeClient
}
