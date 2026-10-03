import { openDatabase, type ConversationRecord } from './db'

export async function getConversation(
  accountId: string,
  conversationId: string,
): Promise<ConversationRecord | null> {
  const database = await openDatabase()
  const record = await database.get('conversations', [accountId, conversationId])
  return record ?? null
}

/**
 * Most recent activity first — the order the chat list renders in — taken from
 * the `byUpdated` index rather than sorted in memory.
 */
export async function listConversations(accountId: string): Promise<ConversationRecord[]> {
  const database = await openDatabase()
  const index = database.transaction('conversations').store.index('byUpdated')
  // `[accountId]` sorts before `[accountId, anything]`, so this range covers
  // exactly one account's rows.
  const range = IDBKeyRange.bound([accountId], [accountId, Number.MAX_SAFE_INTEGER])
  const records = await index.getAll(range)
  return records.reverse()
}

/**
 * Writes a batch — a conversation sync response — in one transaction. All puts
 * are issued before the first await so the transaction cannot auto-commit
 * half-way through a long list.
 */
export async function saveConversations(records: ConversationRecord[]): Promise<void> {
  if (records.length === 0) {
    return
  }
  const database = await openDatabase()
  const transaction = database.transaction('conversations', 'readwrite')
  await Promise.all(records.map((record) => transaction.store.put(record)))
  await transaction.done
}
