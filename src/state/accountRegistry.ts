import type { Account } from '../types'
import { createAccountStore, type AccountStore } from './accountStore'
import type { StoreApi } from 'zustand/vanilla'

/**
 * The per-account stores, one per logged-in account.
 *
 * Up to five accounts live in a tab (brief §8), and each needs its own store for
 * as long as it is signed in — including while another account is the active
 * one, so switching back does not reload history. The map *is* that lifetime.
 */

const stores = new Map<string, StoreApi<AccountStore>>()

/** The store for an account, created on first use. */
export function getAccountStore(account: Account): StoreApi<AccountStore> {
  const existing = stores.get(account.id)
  if (existing !== undefined) {
    return existing
  }

  const store = createAccountStore(account)
  stores.set(account.id, store)
  return store
}

/** The store for an account, without creating one. */
export function getExistingAccountStore(accountId: string): StoreApi<AccountStore> | undefined {
  return stores.get(accountId)
}

/**
 * Drops an account's store.
 *
 * The state is reset before removal so anything still holding a reference sees
 * an empty account instead of the previous session's history.
 */
export function destroyAccountStore(accountId: string): void {
  const store = stores.get(accountId)
  if (store === undefined) {
    return
  }
  store.getState().actions.reset()
  stores.delete(accountId)
}

export function listAccountStoreIds(): string[] {
  return [...stores.keys()]
}
