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

/**
 * Empties a conversation's local history and its pins, keeping the conversation
 * itself in the list.
 *
 * Pins go with the messages because a pin is a pointer to one; a banner that
 * cycles through messages that no longer exist would be worse than no banner.
 *
 * @returns the newest `serverTimestamp` that was removed, which is the cursor
 *          Saved Messages have to be re-read with — their history lives on the
 *          server and would otherwise be loaded straight back.
 */
export async function clearConversationHistory(
  accountId: string,
  conversationId: string,
): Promise<number> {
  const database = await openDatabase()
  const transaction = database.transaction(['messages', 'pinned'], 'readwrite')

  // Ranges rather than a full scan: the messages store holds every conversation
  // the account has ever had, so walking it to delete one would slow down with
  // history the caller is not touching.
  const range = IDBKeyRange.bound([accountId, conversationId], [accountId, conversationId, []])

  // Both stores are reached for in the same task as the transaction, and both
  // drains run at once: an empty range would otherwise let the transaction
  // auto-commit before the second store is touched, which throws.
  const messages = transaction.objectStore('messages').index('byConversation')
  const pinned = transaction.objectStore('pinned')

  let newestServerTimestamp = 0
  const drainMessages = (async () => {
    for await (const cursor of messages.iterate(range)) {
      newestServerTimestamp = Math.max(newestServerTimestamp, cursor.value.serverTimestamp)
      await cursor.delete()
    }
  })()

  await Promise.all([drainMessages, drainRange(pinned, range)])
  await transaction.done

  return newestServerTimestamp
}

/** Only what `drainRange` needs: a cursor source that can also delete. */
type CursorSource = {
  iterate: (range: IDBKeyRange) => AsyncIterable<{ delete: () => Promise<void> }>
}

/**
 * Deletes every row inside a key range.
 *
 * `iterate` — rather than `for await (const cursor of store)` — holds the
 * transaction open between steps, so the loop cannot be cut short by an
 * auto-commit part-way through.
 */
async function drainRange(source: CursorSource, range: IDBKeyRange): Promise<void> {
  for await (const cursor of source.iterate(range)) {
    await cursor.delete()
  }
}

/**
 * Removes a conversation and its local history.
 *
 * Local only, and honest about it: the conversation still exists on the server
 * and comes back with the next sync. A client-side delete cannot do better
 * without a server-side delete endpoint.
 */
export async function deleteConversationLocally(
  accountId: string,
  conversationId: string,
): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(['conversations', 'messages', 'pinned'], 'readwrite')

  await transaction.objectStore('conversations').delete([accountId, conversationId])
  await Promise.all([
    drainConversation(transaction.objectStore('messages'), accountId, conversationId),
    drainConversation(transaction.objectStore('pinned'), accountId, conversationId),
  ])

  await transaction.done
}

/**
 * Deletes every row of one conversation.
 *
 * Drained concurrently rather than one after another: an await between two
 * stores can let the transaction auto-commit, after which touching the next
 * store throws.
 */
async function drainConversation(
  store: AsyncIterable<{ value: { accountId: string; conversationId: string }; delete: () => Promise<void> }>,
  accountId: string,
  conversationId: string,
): Promise<void> {
  for await (const cursor of store) {
    if (cursor.value.accountId === accountId && cursor.value.conversationId === conversationId) {
      await cursor.delete()
    }
  }
}
