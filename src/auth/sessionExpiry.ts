import { i18n } from '../i18n'
import { useToastStore } from '../state/toastStore'
import { useUiStore } from '../state/uiStore'
import { listAccounts } from '../storage/accounts'
import type { Account } from '../types'
import { SESSION_EXPIRED_EVENT, type SessionExpiredDetail } from './sessionEvents'

/**
 * What the app does when the server says the session is gone.
 *
 * Deliberately *not* a sign-out. A rejected token and a revoked device are not
 * the same as a user choosing to leave, and this path can be reached by a
 * server-side revocation made on another device — including one made by
 * accident. So nothing is deleted: the account keeps its messages, its keys and
 * its place in IndexedDB, and the only thing that changes is that it stops being
 * the active one, which is what sends the reader to the login screen.
 *
 * Handling is guarded because a dead session produces a burst of them at once:
 * every request in flight comes back 401 together, and only the first needs to
 * say anything.
 */

/**
 * The handshake codes that mean "this session will never work again".
 *
 * Not `replaced`: that one means another connection took this device's slot, and
 * the session behind it is still perfectly valid.
 */
const DEAD_SESSION_CODES = new Set([
  'unauthorized',
  'session_revoked',
  'device_revoked',
  'account_deleted',
])

export function isDeadSessionCode(code: string): boolean {
  return DEAD_SESSION_CODES.has(code)
}

let handling = false

/** Announces it and steps back from the session. Safe to call repeatedly. */
export async function reportSessionExpired(account: Account): Promise<void> {
  if (handling) {
    return
  }
  handling = true

  try {
    useToastStore.getState().push({ kind: 'error', message: i18n.t('auth.sessionExpired') })

    const ui = useUiStore.getState()
    if (ui.activeAccountId === account.id) {
      // Not `forgetAccount`: the account is only *ended*, never erased. See the
      // note above.
      ui.setActiveAccount(null)
    }
  } finally {
    handling = false
  }
}

/**
 * Listens for the 401 that the HTTP layer reports.
 *
 * Returns its own unsubscribe, so the bootstrap can own the listener's lifetime.
 */
export function installSessionExpiryWatcher(): () => void {
  function handle(event: Event): void {
    const detail = (event as CustomEvent<SessionExpiredDetail>).detail
    const token = detail?.sessionToken ?? null
    if (token === null) {
      return
    }

    void listAccounts()
      .then((accounts) => {
        const account = accounts.find((entry) => entry.sessionToken === token)
        if (account !== undefined) {
          return reportSessionExpired(account)
        }
        return undefined
      })
      .catch((error: unknown) => {
        console.warn('[auth] the expired session could not be resolved', error)
      })
  }

  window.addEventListener(SESSION_EXPIRED_EVENT, handle)
  return () => {
    window.removeEventListener(SESSION_EXPIRED_EVENT, handle)
  }
}
