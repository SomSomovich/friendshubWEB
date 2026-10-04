import { nowSeconds } from '../utils/time'
import { getSetting, setSetting } from '../storage/settings'

/**
 * Messages written while there was no connection to send them over.
 *
 * Kept in the settings store as one JSON array per account rather than in a
 * store of its own: the queue is short, it is read and written whole, and a
 * second object store would need a database version bump — which drops every
 * user's history — for a list that is usually empty.
 */

export type OutboxItem = {
  /** The id of the placeholder message this belongs to. */
  id: string
  conversationId: string
  plaintext: string
  queuedAt: number
}

function key(accountId: string): string {
  return `outbox:${accountId}`
}

export async function listOutbox(accountId: string): Promise<OutboxItem[]> {
  const raw = await getSetting(key(accountId))
  if (raw === null) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isOutboxItem)
  } catch (error) {
    console.warn('[outbox] the stored queue is unreadable', error)
    return []
  }
}

export async function enqueue(accountId: string, item: Omit<OutboxItem, 'queuedAt'>): Promise<void> {
  const queue = await listOutbox(accountId)
  queue.push({ ...item, queuedAt: nowSeconds() })
  await setSetting(key(accountId), JSON.stringify(queue))
}

export async function removeFromOutbox(accountId: string, id: string): Promise<void> {
  const queue = await listOutbox(accountId)
  await setSetting(
    key(accountId),
    JSON.stringify(queue.filter((item) => item.id !== id)),
  )
}

function isOutboxItem(value: unknown): value is OutboxItem {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<OutboxItem>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.conversationId === 'string' &&
    typeof candidate.plaintext === 'string' &&
    typeof candidate.queuedAt === 'number'
  )
}
