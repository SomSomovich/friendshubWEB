import { nowSeconds } from '../utils/time'
import { openDatabase, type PinnedRecord } from './db'
import { getMessageByMessageId } from './messages'

/**
 * The local copy of a conversation's pins.
 *
 * The server is the source of truth now (API_FRONTEND.txt §11): this store is
 * what lets the banner render without a round trip and survive being offline.
 * Reconciling it with the server lives in `src/state/pins.ts`.
 *
 * A pin is stored twice: as its own record (the banner's list) and as
 * `Message.isPinned` (what a scrolling row reads). Both are written in one
 * transaction so the two views cannot disagree.
 *
 * The pin names the message by its logical id, which is the same id the server
 * pins by — so a pin recorded here and a pin recorded there are the same fact,
 * and neither needs translating.
 */

/** The local row a pin refers to, looked up when the caller does not have it. */
async function resolveEnvelopeId(
  accountId: string,
  conversationId: string,
  messageId: string,
  envelopeId: string | undefined,
): Promise<string | null> {
  if (envelopeId !== undefined) {
    return envelopeId
  }
  const record = await getMessageByMessageId(accountId, conversationId, messageId)
  return record?.envelopeId ?? null
}

/**
 * @param envelopeId the local row to flag. Optional because a pin can arrive
 *                   from the server for a message this device never stored, and
 *                   then there is nothing to flag — only the pin itself.
 * @param pinnedAt   the server's timestamp, when it came from there. The local
 *                   clock is the fallback, and it only orders the banner.
 */
export async function pinMessage(
  accountId: string,
  conversationId: string,
  messageId: string,
  envelopeId?: string,
  pinnedAt?: number,
): Promise<void> {
  const row = await resolveEnvelopeId(accountId, conversationId, messageId, envelopeId)
  const database = await openDatabase()
  const transaction = database.transaction(['pinned', 'messages'], 'readwrite')

  const record: PinnedRecord = {
    accountId,
    conversationId,
    messageId,
    pinnedAt: pinnedAt ?? nowSeconds(),
  }
  await transaction.objectStore('pinned').put(record)

  if (row !== null) {
    const message = await transaction.objectStore('messages').get(row)
    if (message && message.accountId === accountId) {
      await transaction.objectStore('messages').put({ ...message, isPinned: true })
    }
  }

  await transaction.done
}

export async function unpinMessage(
  accountId: string,
  conversationId: string,
  messageId: string,
  envelopeId?: string,
): Promise<void> {
  const row = await resolveEnvelopeId(accountId, conversationId, messageId, envelopeId)
  const database = await openDatabase()
  const transaction = database.transaction(['pinned', 'messages'], 'readwrite')

  await transaction.objectStore('pinned').delete([accountId, conversationId, messageId])

  if (row !== null) {
    const message = await transaction.objectStore('messages').get(row)
    if (message && message.accountId === accountId) {
      await transaction.objectStore('messages').put({ ...message, isPinned: false })
    }
  }

  await transaction.done
}

/**
 * Oldest pin first, which is the order the banner cycles through.
 *
 * The store has no index (its key is already account- and conversation-scoped),
 * and the per-conversation pin count is small, so filtering in memory beats
 * adding an index for a list that never grows large.
 *
 * `pinnedAt` has second resolution, so two pins can share it; the message id is
 * the tie-break that keeps the order stable instead of depending on key order.
 */
export async function listPinned(
  accountId: string,
  conversationId: string,
): Promise<PinnedRecord[]> {
  const database = await openDatabase()
  const records = await database.getAll('pinned')
  return records
    .filter(
      (record) => record.accountId === accountId && record.conversationId === conversationId,
    )
    .sort(
      (left, right) =>
        left.pinnedAt - right.pinnedAt || left.messageId.localeCompare(right.messageId),
    )
}
