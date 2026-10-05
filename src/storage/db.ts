import {
  deleteDB,
  openDB,
  type DBSchema,
  type IDBPDatabase,
  type IDBPTransaction,
  type StoreNames,
} from 'idb'
import type { Account, Attachment, Conversation, Message } from '../types'

/**
 * The single IndexedDB database. Up to five accounts share it, so every
 * record that belongs to an account carries `accountId` — either as part of its
 * key or as an index prefix — and every accessor is scoped by it.
 */

export const DATABASE_NAME = 'friendshub'

/**
 * Bump this together with a branch in `upgradeSchema`. Existing stores are never
 * recreated: that would drop the user's message history, which is the one thing
 * in this database that cannot be fetched again.
 *
 * 2 — the payload contract moved every message to a JSON body with a logical
 *     `messageId`, so rows written before it have to be given one.
 */
export const DATABASE_VERSION = 2

/** The account record is keyed by its own id, so it needs no prefix. */
export type ConversationRecord = Conversation & { accountId: string }
export type MessageRecord = Message & { accountId: string }
export type AttachmentRecord = Attachment & { accountId: string }
export type CryptoStateRecord = { accountId: string; json: string; updatedAt: number }
/**
 * A pin names its message by the logical id, not by an envelope.
 *
 * The server does the same (API_FRONTEND.txt §11), and one message has as many
 * envelope ids as the recipient has devices — so an envelope-keyed pin would
 * stop meaning anything the moment a second device existed.
 */
export type PinnedRecord = {
  accountId: string
  conversationId: string
  messageId: string
  pinnedAt: number
}
export type SettingRecord = { key: string; value: string }

/** Minimal device data needed to build a prekey bundle. */
export type CachedDevice = {
  deviceNumber: number
  registrationId: number
  identityKeyPub: string
}
export type DevicesCacheRecord = {
  accountId: string
  peerAccountId: string
  devices: CachedDevice[]
  cachedAt: number
}

/**
 * `attachments` is not in the subphase spec's store list but is required by the
 * attachment flow: the symmetric key arrives in its own envelope and must be
 * persisted before the message that references it is opened.
 */
export interface FriendsHubDB extends DBSchema {
  accounts: { key: string; value: Account }
  conversations: {
    key: [string, string]
    value: ConversationRecord
    indexes: { byUpdated: [string, number] }
  }
  messages: {
    key: string
    value: MessageRecord
    indexes: {
      byConversation: [string, string, number]
      byConversationServer: [string, string, number]
      /**
       * The logical id, so an edit or a reaction that arrives for a message
       * outside the open window can still be applied. Envelope ids cannot do
       * this job: one message has as many of them as the recipient has devices.
       */
      byMessageId: string
    }
  }
  crypto_state: { key: string; value: CryptoStateRecord }
  pinned: { key: [string, string, string]; value: PinnedRecord }
  settings: { key: string; value: SettingRecord }
  devices_cache: { key: [string, string]; value: DevicesCacheRecord }
  attachments: {
    key: [string, string]
    value: AttachmentRecord
    indexes: { byConversation: [string, string] }
  }
}

let databasePromise: Promise<IDBPDatabase<FriendsHubDB>> | null = null

/**
 * The shared connection, opened once per page. Concurrent callers get the same
 * promise, so `blocked`/`blocking` handling below applies to a single
 * connection rather than one per call.
 */
export function openDatabase(): Promise<IDBPDatabase<FriendsHubDB>> {
  if (databasePromise === null) {
    databasePromise = openDB<FriendsHubDB>(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(database, oldVersion, _newVersion, transaction) {
        return upgradeSchema(database, oldVersion, transaction)
      },
      blocked() {
        console.warn(
          '[storage] another tab still holds an older version of the database; waiting for it to close',
        )
      },
      blocking() {
        console.warn('[storage] closing the database because another tab is upgrading it')
      },
      terminated() {
        // The browser killed the connection (crash or forced upgrade). Dropping
        // the cached handle lets the next call reopen it instead of failing
        // against a dead connection forever.
        databasePromise = null
      },
    })
  }
  return databasePromise
}

async function upgradeSchema(
  database: IDBPDatabase<FriendsHubDB>,
  oldVersion: number,
  transaction: IDBPTransaction<FriendsHubDB, StoreNames<FriendsHubDB>[], 'versionchange'>,
): Promise<void> {
  if (oldVersion < 1) {
    database.createObjectStore('accounts', { keyPath: 'id' })

    const conversations = database.createObjectStore('conversations', {
      keyPath: ['accountId', 'id'],
    })
    conversations.createIndex('byUpdated', ['accountId', 'updatedAt'])

    const messages = database.createObjectStore('messages', { keyPath: 'envelopeId' })
    messages.createIndex('byConversation', ['accountId', 'conversationId', 'clientTimestamp'])
    messages.createIndex('byConversationServer', [
      'accountId',
      'conversationId',
      'serverTimestamp',
    ])

    database.createObjectStore('crypto_state', { keyPath: 'accountId' })
    // Created without its key path here; the version 2 branch below is what
    // builds it, so a fresh database and an upgraded one end up identical.

    database.createObjectStore('settings', { keyPath: 'key' })
    database.createObjectStore('devices_cache', { keyPath: ['accountId', 'peerAccountId'] })

    const attachments = database.createObjectStore('attachments', {
      keyPath: ['accountId', 'id'],
    })
    attachments.createIndex('byConversation', ['accountId', 'conversationId'])
  }

  if (oldVersion < 2) {
    // Rows written by the previous contract have no logical id and a reply field
    // that no longer exists. The copy's own envelope id is the only sane stand-in:
    // it is unique, stable, and every later operation on that message will then
    // address it by this value.
    await migrateMessagesToLogicalIds(transaction)
    transaction.objectStore('messages').createIndex('byMessageId', 'messageId')
    await migratePinsToMessageIds(database, transaction)
  }

  // Later versions add `if (oldVersion < N) { ... }` branches here, and never
  // recreate an existing store.
}

/**
 * Rebuilds the pin store around `messageId`.
 *
 * A key path cannot be changed in place, so the store is dropped and recreated
 * inside the same transaction — the rows are read first and written back, so
 * nothing is lost. A pin written before the contract named its message by its
 * envelope id, and for those rows the two are the same value.
 */
async function migratePinsToMessageIds(
  database: IDBPDatabase<FriendsHubDB>,
  transaction: IDBPTransaction<FriendsHubDB, StoreNames<FriendsHubDB>[], 'versionchange'>,
): Promise<void> {
  const existing = database.objectStoreNames.contains('pinned')
  const legacy = existing
    ? ((await transaction.objectStore('pinned').getAll()) as Array<
        PinnedRecord & { envelopeId?: string }
      >)
    : []
  const migrated = legacy.map((row) => ({
    accountId: row.accountId,
    conversationId: row.conversationId,
    messageId: row.messageId ?? row.envelopeId ?? '',
    pinnedAt: row.pinnedAt,
  }))

  // The store methods live on the connection, not on the transaction, even
  // though only a versionchange transaction may call them. A fresh database has
  // no store to drop — the version 1 branch deliberately leaves this one to be
  // built here, so that a new database and an upgraded one end up identical.
  if (existing) {
    database.deleteObjectStore('pinned')
  }
  const store = database.createObjectStore('pinned', {
    keyPath: ['accountId', 'conversationId', 'messageId'],
  })
  for (const row of migrated) {
    await store.put(row)
  }
}

/** Gives pre-`messageId` rows one, and drops the fields the contract retired. */
async function migrateMessagesToLogicalIds(
  transaction: IDBPTransaction<FriendsHubDB, StoreNames<FriendsHubDB>[], 'versionchange'>,
): Promise<void> {
  const store = transaction.objectStore('messages')
  let cursor = await store.openCursor()

  while (cursor !== null) {
    const legacy = cursor.value as MessageRecord & Record<string, unknown>
    const next: MessageRecord = {
      ...legacy,
      messageId: typeof legacy.messageId === 'string' ? legacy.messageId : legacy.envelopeId,
      replyTo: null,
      forwardFrom: null,
    }

    // Dead weight from the old contract: a per-device envelope map that nothing
    // reads now that actions are addressed by the logical id.
    delete (next as Record<string, unknown>)['envelopeIdsByDevice']
    delete (next as Record<string, unknown>)['replyToEnvelopeId']

    await cursor.update(next)
    cursor = await cursor.continue()
  }
}

/**
 * Drops the whole database. Used by the storage test harness and by a future
 * "erase everything" action — never by a plain logout, which purges one account.
 */
export async function deleteDatabase(): Promise<void> {
  if (databasePromise !== null) {
    const database = await databasePromise
    database.close()
    databasePromise = null
  }
  await deleteDB(DATABASE_NAME)
}
