/**
 * The one name under which "this session is dead" travels from the HTTP layer
 * up to the app.
 *
 * A browser event, and a module with no imports, because the two ends are the
 * deepest and the highest parts of the app: `src/api/client.ts` sees the 401 but
 * knows nothing about accounts, and the handler needs the account registry and
 * the UI store. An event is what lets the first tell the second without the
 * client importing the whole auth stack — which would be a cycle, since the auth
 * stack is built on the client.
 */

export const SESSION_EXPIRED_EVENT = 'fh:session-expired'

export type SessionExpiredDetail = {
  /**
   * The token the rejected request used, which is how the handler finds the
   * account it belongs to. `null` when the caller had no account attached.
   */
  sessionToken: string | null
}

/** Guarded for Node: the same client module runs in the smoke scripts. */
export function announceSessionExpired(sessionToken: string | null): void {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(
    new CustomEvent<SessionExpiredDetail>(SESSION_EXPIRED_EVENT, {
      detail: { sessionToken },
    }),
  )
}
