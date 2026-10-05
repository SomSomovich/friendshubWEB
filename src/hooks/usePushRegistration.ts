import { useEffect, useRef } from 'react'
import { ensurePushRegistered } from '../pwa/push'
import { useActiveAccount } from './useActiveAccount'

/**
 * Re-registers this device's push subscription after a sign-in.
 *
 * The permission survives a logout and so does the browser's own subscription,
 * so this is not an ask — it is telling the server which device to wake, which
 * it has no way to remember across a new session. Once per account per page
 * load: the subscription does not change while the tab lives.
 */
export function usePushRegistration(): void {
  const account = useActiveAccount()
  const registeredRef = useRef<string | null>(null)

  useEffect(() => {
    if (account === null || registeredRef.current === account.id) {
      return
    }
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return
    }

    registeredRef.current = account.id
    void ensurePushRegistered(account).catch((error: unknown) => {
      // A device that cannot be woken still receives everything over the socket.
      console.warn('[push] the device could not be registered', error)
    })
  }, [account])
}
