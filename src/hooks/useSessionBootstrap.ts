import { useEffect } from 'react'
import { getAccountStore } from '../state/accountRegistry'
import { ACTIVE_ACCOUNT_PREFERENCE_KEY } from '../state/preferences'
import { useUiStore } from '../state/uiStore'
import { listAccounts } from '../storage/accounts'
import { readPreference } from '../utils/browserStorage'

/**
 * Restores the signed-in accounts once, at start-up.
 *
 * IndexedDB is the only durable record of a session — the account row holds the
 * token, and the crypto snapshot lives beside it — so the registry and the UI
 * store are rebuilt from there before any route decides whether the visitor is
 * signed in.
 */
export function useSessionBootstrap(): void {
  const setActiveAccount = useUiStore((state) => state.setActiveAccount)
  const setSessionReady = useUiStore((state) => state.setSessionReady)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const accounts = await listAccounts()
        if (cancelled) {
          return
        }

        for (const account of accounts) {
          getAccountStore(account)
        }

        const remembered = readPreference(ACTIVE_ACCOUNT_PREFERENCE_KEY)
        const active =
          accounts.find((account) => account.id === remembered) ?? accounts.at(0) ?? null
        setActiveAccount(active?.id ?? null)
      } catch (error) {
        // A broken database must still render the app: the visitor simply looks
        // signed out, which is recoverable, unlike a blank screen.
        console.error('[state] could not restore the signed-in accounts', error)
      } finally {
        if (!cancelled) {
          setSessionReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [setActiveAccount, setSessionReady])
}
