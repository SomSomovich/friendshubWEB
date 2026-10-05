import {
  listPinnedMessages,
  pinMessage as pinOnServer,
  unpinMessage as unpinOnServer,
} from '../api/pins'
import type { MessageRecord } from '../storage/db'
import { listPinned, pinMessage, unpinMessage } from '../storage/pinned'
import { getSetting, setSetting } from '../storage/settings'
import type { Account } from '../types'

/**
 * Pins, which the server owns and this device caches.
 *
 * Before this subphase a pin was local only — nothing told the server, and the
 * other participants never saw it. Now the server holds them, every device
 * agrees, and the local store is a cache that makes the banner render without a
 * round trip.
 */

/** Set once the local-only pins of an older build have been handed over. */
function migratedKey(accountId: string): string {
  return `pins_migrated:${accountId}`
}

/**
 * Brings the local cache into line with the server.
 *
 * The one asymmetry is the first run after the update: a pin made back then
 * exists only here, and the server has no way to have heard about it. Those are
 * uploaded once, and the fact is recorded — afterwards a pin the server does not
 * know about is one somebody else removed, and it goes.
 *
 * Called when a conversation is opened and when the socket reconnects, which are
 * the two moments the answer can have changed without this device noticing.
 */
export async function refreshPins(account: Account, conversationId: string): Promise<void> {
  const [server, local, migrated] = await Promise.all([
    listPinnedMessages(account, conversationId),
    listPinned(account.id, conversationId),
    getSetting(migratedKey(account.id)),
  ])

  const onServer = new Map(server.map((entry) => [entry.messageId, entry]))
  const localIds = new Set(local.map((record) => record.messageId))

  // Adoption first, so a message pinned before the update is not thrown away by
  // the same pass that reads it back.
  if (migrated === null) {
    for (const record of local) {
      if (!onServer.has(record.messageId)) {
        await pinOnServer(account, conversationId, record.messageId).catch((error: unknown) => {
          console.warn('[pins] a local pin could not be handed to the server', error)
        })
      }
    }
    await setSetting(migratedKey(account.id), '1')
  } else {
    for (const record of local) {
      if (!onServer.has(record.messageId)) {
        await unpinMessage(account.id, conversationId, record.messageId)
      }
    }
  }

  for (const entry of server) {
    if (!localIds.has(entry.messageId)) {
      await pinMessage(account.id, conversationId, entry.messageId, undefined, entry.pinnedAt)
    }
  }
}

/**
 * Pins or unpins one message, server first.
 *
 * The server is written before the cache: a pin the server refused must not sit
 * in the local store looking as though it worked. An offline failure therefore
 * reports rather than pretending, and the pin stays where it was.
 */
export async function togglePin(account: Account, message: MessageRecord): Promise<boolean> {
  const next = !message.isPinned

  if (next) {
    await pinOnServer(account, message.conversationId, message.messageId)
    await pinMessage(
      account.id,
      message.conversationId,
      message.messageId,
      message.envelopeId,
    )
    return true
  }

  await unpinOnServer(account, message.conversationId, message.messageId)
  await unpinMessage(account.id, message.conversationId, message.messageId, message.envelopeId)
  return false
}
