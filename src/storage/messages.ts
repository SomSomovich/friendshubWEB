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

export async function deleteMessage(accountId: string, envelopeId: string): Promise<void> {
  await mutateMessage(accountId, envelopeId, () => null)
}
