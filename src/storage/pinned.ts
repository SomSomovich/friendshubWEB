import { nowSeconds } from '../utils/time'
import { openDatabase, type PinnedRecord } from './db'

/**
 * Pinned messages are local-only — nothing about them is ever sent to the server
 * — but they are stored twice: as their own record (the banner's list) and as
 * `Message.isPinned` (what a scrolling row reads). Both are written in one
 * transaction so the two views cannot disagree.
 */

export async function pinMessage(
  accountId: string,
  conversationId: string,
  envelopeId: string,
): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(['pinned', 'messages'], 'readwrite')

  const record: PinnedRecord = { accountId, conversationId, envelopeId, pinnedAt: nowSeconds() }
  await transaction.objectStore('pinned').put(record)

  const message = await transaction.objectStore('messages').get(envelopeId)
  if (message && message.accountId === accountId) {
    await transaction.objectStore('messages').put({ ...message, isPinned: true })
  }

  await transaction.done
}

export async function unpinMessage(
  accountId: string,
  conversationId: string,
  envelopeId: string,
): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(['pinned', 'messages'], 'readwrite')

  await transaction.objectStore('pinned').delete([accountId, conversationId, envelopeId])

  const message = await transaction.objectStore('messages').get(envelopeId)
  if (message && message.accountId === accountId) {
    await transaction.objectStore('messages').put({ ...message, isPinned: false })
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
 * `pinnedAt` has second resolution, so two pins can share it; the envelope id is
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
        left.pinnedAt - right.pinnedAt || left.envelopeId.localeCompare(right.envelopeId),
    )
}
