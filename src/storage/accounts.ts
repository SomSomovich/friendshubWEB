import type { Account } from '../types'
import { withCryptoLock } from './crypto_state'
import { openDatabase } from './db'

/**
 * Accounts are the top-level entity: the switcher reads them, and every other
 * store is scoped by one of their ids.
 */

export async function saveAccount(account: Account): Promise<void> {
  const database = await openDatabase()
  await database.put('accounts', account)
}

export async function getAccount(accountId: string): Promise<Account | null> {
  const database = await openDatabase()
  const account = await database.get('accounts', accountId)
  return account ?? null
}

/**
 * Ordered by account id. The server issues UUIDv7, whose leading bytes are a
 * timestamp, so key order is creation order.
 */
export async function listAccounts(): Promise<Account[]> {
  const database = await openDatabase()
  return database.getAll('accounts')
}

/**
 * Only the two things `drainAccountRows` needs from an idb cursor. Declaring it
 * structurally keeps the helper free of idb's store-name generics, which do not
 * survive being passed around as a union.
 */
type AccountScopedCursor = {
  value: { accountId: string }
  delete: () => Promise<void>
}

/** Every store that holds rows belonging to exactly one account. */
const ACCOUNT_SCOPED_STORES = [
  'conversations',
  'messages',
  'attachments',
  'pinned',
  'devices_cache',
] as const

/**
 * Deletes every row of one account from a store.
 *
 * Rows are matched by their own `accountId` field rather than by a key range:
 * `messages` is keyed by `envelopeId` alone, so no single range shape covers
 * every store, while a value check is uniformly correct.
 */
async function drainAccountRows(
  store: AsyncIterable<AccountScopedCursor>,
  accountId: string,
): Promise<void> {
  for await (const cursor of store) {
    if (cursor.value.accountId === accountId) {
      await cursor.delete()
    }
  }
}

/**
 * Removes the account and every trace of it in a single transaction, so a crash
 * cannot leave a half-deleted account behind.
 *
 * All stores are drained concurrently rather than one after another: an await
 * between two stores can let the transaction auto-commit (nothing pending at that
 * moment), after which touching the next store throws.
 *
 * The crypto lock is taken first because snapshot persistence writes the
 * crypto-state row; without it a concurrent write could resurrect it right after
 * the purge.
 */
export async function purgeAccount(accountId: string): Promise<void> {
  await withCryptoLock(accountId, async () => {
    const database = await openDatabase()
    const transaction = database.transaction(
      ['accounts', 'crypto_state', ...ACCOUNT_SCOPED_STORES],
      'readwrite',
    )

    await transaction.objectStore('accounts').delete(accountId)
    await transaction.objectStore('crypto_state').delete(accountId)

    await Promise.all(
      ACCOUNT_SCOPED_STORES.map((storeName) =>
        drainAccountRows(transaction.objectStore(storeName), accountId),
      ),
    )

    await transaction.done
  })
}
