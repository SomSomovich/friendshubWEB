import type { Account } from '../types'
import { getExistingAccountStore } from '../state/accountRegistry'
import { useUiStore } from '../state/uiStore'

/**
 * The account whose data the UI is showing, or `null` when nobody is signed in.
 *
 * The full record (token included) rather than just the id, because screens need
 * the avatar, the FH number and the session for API calls.
 *
 * The account lives on a vanilla store and is read with `getState()`, so this
 * also subscribes to the revision counter — otherwise renaming the account or
 * uploading an avatar would only update the screen that made the change.
 */
export function useActiveAccount(): Account | null {
  const activeAccountId = useUiStore((state) => state.activeAccountId)
  useUiStore((state) => state.accountRevision)

  if (activeAccountId === null) {
    return null
  }
  return getExistingAccountStore(activeAccountId)?.getState().account ?? null
}
