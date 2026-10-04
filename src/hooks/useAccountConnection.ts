import { useEffect } from 'react'
import { resumeConnection } from '../state/connection'
import { useActiveAccount } from './useActiveAccount'

/**
 * Puts the socket back the way the user left it.
 *
 * Signing in opens a connection, but a reload does not — IndexedDB restores the
 * session and nothing else. Mounting this in the app shell is what makes a
 * restored session live again, and it is also what hands the socket over when
 * the user switches accounts, because `resumeConnection` closes the previous one
 * rather than letting two run at once.
 *
 * It never prepares an account: that registers a device, and a page load is not
 * a good moment to do something the user cannot see.
 */
export function useAccountConnection(): void {
  const account = useActiveAccount()

  useEffect(() => {
    if (account === null) {
      return
    }

    void resumeConnection(account).catch((error: unknown) => {
      // A failure here costs live delivery, not the session: the app stays
      // usable and the next mount tries again.
      console.error('[state] the account could not be reconnected', error)
    })
  }, [account])
}
