import type { MessageStatus, Reaction } from '../types'
import { openDatabase, type MessageRecord } from './db'

/** Fields a caller may change on a stored message; the rest identify it. */
export type MessageChanges = Partial<
  Omit<MessageRecord, 'accountId' | 'envelopeId' | 'conversationId'>
>

export const DEFAULT_MESSAGE_PAGE_SIZE = 50

export type MessagePageQuery = {
  /**
   * Inclusive upper bound on `clientTimestamp`, exclusive of nothing else.
   *
   * Inclusive on purpose: `clientTimestamp` has second resolution, so two
   * messages can share it, and an exclusive bound would skip the rest of that
   * second forever. Callers merge pages by `envelopeId` to drop the repeats.
   */
  until?: number
  limit?: number
}

export async function saveMessage(record: MessageRecord): Promise<void> {
  const database = await openDatabase()
  await database.put('messages', record)
}

/** Bulk write for a backlog replay; same batching rules as conversation sync. */
export async function saveMessages(records: MessageRecord[]): Promise<void> {
  if (records.length === 0) {
    return
  }
  const database = await openDatabase()
  const transaction = database.transaction('messages', 'readwrite')
  await Promise.all(records.map((record) => transaction.store.put(record)))
  await transaction.done
}

/**
 * Messages are keyed by `envelopeId` alone, so the owning account is verified
 * rather than assumed — a colliding id must not cross accounts.
 */
export async function getMessage(
  accountId: string,
  envelopeId: string,
): Promise<MessageRecord | null> {
  const database = await openDatabase()
  const record = await database.get('messages', envelopeId)
  if (!record || record.accountId !== accountId) {
    return null
  }
  return record
}

/** Newest first, one page at a time. */
export async function getMessages(
  accountId: string,
  conversationId: string,
  query: MessagePageQuery = {},
): Promise<MessageRecord[]> {
  const limit = query.limit ?? DEFAULT_MESSAGE_PAGE_SIZE
  if (limit < 1) {
    return []
  }

  const database = await openDatabase()
  const index = database.transaction('messages').store.index('byConversation')
  const lower: [string, string] = [accountId, conversationId]
  const upper: [string, string, number] = [
    accountId,
    conversationId,
    query.until ?? Number.MAX_SAFE_INTEGER,
  ]

  const records: MessageRecord[] = []
  let cursor = await index.openCursor(IDBKeyRange.bound(lower, upper), 'prev')
  while (cursor !== null && records.length < limit) {
    records.push(cursor.value)
    cursor = await cursor.continue()
  }
  return records
}

/**
 * Applies one mutation to a stored message inside a single transaction, and only
 * when the record exists and belongs to the account.
 *
 * The mutator returns `null` to delete, the same record reference to signal "no
 * change", or a new record to write.
 */
async function mutateMessage(
  accountId: string,
  envelopeId: string,
  mutate: (record: MessageRecord) => MessageRecord | null,
): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction('messages', 'readwrite')
  const record = await transaction.store.get(envelopeId)

  if (record && record.accountId === accountId) {
    const next = mutate(record)
    if (next === null) {
      await transaction.store.delete(envelopeId)
    } else if (next !== record) {
      // Identity fields are pinned last so a caller cannot rename them into a
      // record that no longer matches its key.
      await transaction.store.put({ ...next, accountId, envelopeId })
    }
  }

  await transaction.done
}

export async function updateMessage(
  accountId: string,
  envelopeId: string,
  changes: MessageChanges,
): Promise<void> {
  await mutateMessage(accountId, envelopeId, (record) => ({ ...record, ...changes }))
}

/** Delivery-state transition (`sending` → `sent` → `delivered` → `read`). */
export async function updateStatus(
  accountId: string,
  envelopeId: string,
  status: MessageStatus,
): Promise<void> {
  await mutateMessage(accountId, envelopeId, (record) => ({ ...record, status }))
}

export async function addReaction(
  accountId: string,
  envelopeId: string,
  reaction: Reaction,
): Promise<void> {
  await mutateMessage(accountId, envelopeId, (record) => ({
    ...record,
    // One reaction per actor: a repeat replaces the emoji, matching the server.
    reactions: [
      ...record.reactions.filter((existing) => existing.actorId !== reaction.actorId),
      reaction,
    ],
  }))
}

export async function removeReaction(
  accountId: string,
  envelopeId: string,
  actorId: string,
): Promise<void> {
  await mutateMessage(accountId, envelopeId, (record) => {
    const reactions = record.reactions.filter((existing) => existing.actorId !== actorId)
    return reactions.length === record.reactions.length ? record : { ...record, reactions }
  })
}

/**
 * How many messages arrived after `afterSeconds` (exclusive).
 *
 * Counted from the index rather than by reading rows: the chat list asks this
 * once per conversation, and `count` stays cheap as history grows.
 */
export async function countMessagesAfter(
  accountId: string,
  conversationId: string,
  afterSeconds: number,
): Promise<number> {
  const database = await openDatabase()
  const index = database.transaction('messages').store.index('byConversation')
  const lower: [string, string, number] = [accountId, conversationId, afterSeconds]
  const upper: [string, string, number] = [
    accountId,
    conversationId,
    Number.MAX_SAFE_INTEGER,
  ]
  return index.count(IDBKeyRange.bound(lower, upper, true))
}

export async function deleteMessage(accountId: string, envelopeId: string): Promise<void> {
  await mutateMessage(accountId, envelopeId, () => null)
}

/**
 * Marks this account's own messages as delivered.
 *
 * The server's receipt says it stored the envelope, which is the only delivery
 * signal this protocol offers — read receipts are an envelope type this client
 * neither sends nor receives. Incoming messages are skipped: their status is
 * never rendered.
 *
 * @returns the ids that actually changed, so the caller can refresh one open
 *          window without re-reading it.
 */
export async function markDelivered(
  accountId: string,
  envelopeIds: string[],
): Promise<string[]> {
  if (envelopeIds.length === 0) {
    return []
  }

  const database = await openDatabase()
  const transaction = database.transaction('messages', 'readwrite')
  const store = transaction.store

  // Every read is issued before the first await resolves, so the transaction
  // cannot auto-commit between two of them.
  const records = await Promise.all(envelopeIds.map((envelopeId) => store.get(envelopeId)))
  const deliverable = records.filter(
    (record): record is MessageRecord =>
      record !== undefined &&
      record.accountId === accountId &&
      record.senderAccountId === accountId &&
      (record.status === 'sent' || record.status === 'sending'),
  )

  await Promise.all(
    deliverable.map((record) => store.put({ ...record, status: 'delivered' })),
  )
  await transaction.done

  return deliverable.map((record) => record.envelopeId)
}

/** How far back an in-chat search looks; history past it needs a server index. */
const SEARCH_SCAN_LIMIT = 5_000

/**
 * Substring search over the decrypted text of one conversation, newest first.
 *
 * Local by necessity: the server holds ciphertext, so it cannot be asked. The
 * scan is bounded rather than unbounded because a long conversation is walked in
 * memory, and one slow search must not be able to stall the tab.
 */
export async function searchMessages(
  accountId: string,
  conversationId: string,
  query: string,
  limit = 100,
): Promise<MessageRecord[]> {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0 || limit < 1) {
    return []
  }

  const database = await openDatabase()
  const index = database.transaction('messages').store.index('byConversation')
  const lower: [string, string, number] = [accountId, conversationId, 0]
  const upper: [string, string, number] = [
    accountId,
    conversationId,
    Number.MAX_SAFE_INTEGER,
  ]

  const found: MessageRecord[] = []
  let scanned = 0
  let cursor = await index.openCursor(IDBKeyRange.bound(lower, upper), 'prev')

  while (cursor !== null && found.length < limit && scanned < SEARCH_SCAN_LIMIT) {
    scanned += 1
    const record = cursor.value
    if (record.plaintext !== null && record.plaintext.toLowerCase().includes(needle)) {
      found.push(record)
    }
    cursor = await cursor.continue()
  }

  return found
}
