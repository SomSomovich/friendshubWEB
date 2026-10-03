import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Account, Attachment, Conversation, Message } from '../types'

/**
 * The single IndexedDB database. Up to five accounts share it, so every
 * record that belongs to an account carries `accountId` — either as part of its
 * key or as an index prefix — and every accessor is scoped by it.
 */

export const DATABASE_NAME = 'friendshub'

/**
 * Bump this together with a branch in `upgradeSchema`. Existing stores are never
 * recreated: that would drop the user's message history.
 */
export const DATABASE_VERSION = 1

/** The account record is keyed by its own id, so it needs no prefix. */
export type ConversationRecord = Conversation & { accountId: string }
export type MessageRecord = Message & { accountId: string }
export type AttachmentRecord = Attachment & { accountId: string }
export type CryptoStateRecord = { accountId: string; json: string; updatedAt: number }
export type PinnedRecord = {
  accountId: string
  conversationId: string
  envelopeId: string
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
      upgrade(database, oldVersion) {
        upgradeSchema(database, oldVersion)
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

function upgradeSchema(database: IDBPDatabase<FriendsHubDB>, oldVersion: number): void {
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
    database.createObjectStore('pinned', { keyPath: ['accountId', 'conversationId', 'envelopeId'] })
    database.createObjectStore('settings', { keyPath: 'key' })
    database.createObjectStore('devices_cache', { keyPath: ['accountId', 'peerAccountId'] })

    const attachments = database.createObjectStore('attachments', {
      keyPath: ['accountId', 'id'],
    })
    attachments.createIndex('byConversation', ['accountId', 'conversationId'])
  }

  // Later versions add `if (oldVersion < N) { ... }` branches here, and never
  // recreate an existing store.
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
