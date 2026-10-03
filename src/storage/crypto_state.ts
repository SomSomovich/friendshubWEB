import { nowMillis } from '../utils/time'
import { openDatabase, type CryptoStateRecord } from './db'

/**
 * Crypto snapshots are the one thing in this database where a lost write is
 * unrecoverable: the WASM module's state (sessions, sender keys, prekeys) only
 * exists in memory otherwise. Every write therefore goes through a Web Lock.
 */

/**
 * The prompt-specified lock name. One lock per account: two tabs signed into the
 * same account must not write snapshots concurrently, while five different
 * accounts in one tab must not block each other.
 */
const LOCK_PREFIX = 'crypto_state_'

function lockName(accountId: string): string {
  return `${LOCK_PREFIX}${accountId}`
}

/**
 * Runs `operation` while holding the account's crypto-state lock.
 *
 * Fails loudly when Web Locks is unavailable: writing unsynchronised state would
 * silently corrupt the module's snapshot, and a clear error at startup is far
 * cheaper to diagnose than intermittent lost history.
 */
export async function withCryptoLock<T>(
  accountId: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    throw new Error('[storage] Web Locks API unavailable: refusing to write crypto state')
  }
  return navigator.locks.request(lockName(accountId), () => operation())
}

/** Persists a snapshot produced by `snapshot()` from the WASM bridge. */
export async function saveSnapshot(accountId: string, json: string): Promise<void> {
  await withCryptoLock(accountId, async () => {
    const database = await openDatabase()
    const record: CryptoStateRecord = { accountId, json, updatedAt: nowMillis() }
    await database.put('crypto_state', record)
  })
}

/**
 * The stored snapshot, or `null` when the account was never persisted.
 *
 * No lock is taken: a read cannot corrupt anything, and holding the lock for
 * reads would stall the first decrypt after a tab switch.
 */
export async function loadSnapshot(accountId: string): Promise<string | null> {
  const database = await openDatabase()
  const record = await database.get('crypto_state', accountId)
  return record?.json ?? null
}
