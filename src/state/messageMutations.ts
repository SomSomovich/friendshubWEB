import { sendMessageAction } from '../crypto/messageActions'
import type { MessageRecord } from '../storage/db'
import { pinMessage, unpinMessage } from '../storage/pinned'
import type { Account, Reaction } from '../types'
import { ownReaction } from '../utils/reactions'
import { nowSeconds } from '../utils/time'

/**
 * Changing a message that already exists.
 *
 * `src/crypto/messageActions.ts` puts the change on the wire; this layer applies
 * the same change to the local copy, which is the half that has no other author.
 * A message cannot carry its own edit: the sender does not receive their own
 * envelopes back, so if this were skipped the author would be the one device
 * still showing the old text.
 */

/**
 * Adds, replaces or removes this account's reaction, and returns the resulting
 * set so the caller can hand it to the store.
 */
export async function applyReaction(
  account: Account,
  message: MessageRecord,
  emoji: string,
): Promise<Reaction[]> {
  const existing = ownReaction(message.reactions, account.id)
  // One reaction per actor, so reacting with the emoji already chosen takes it
  // back — the same rule the server applies.
  const remove = existing === emoji

  await sendMessageAction(account, message, { kind: 'reaction', emoji, remove })

  const others = message.reactions.filter((reaction) => reaction.actorId !== account.id)
  if (remove) {
    return others
  }
  return [...others, { actorId: account.id, emoji, createdAt: nowSeconds() }]
}

/** Rewrites a message's text and returns the edit timestamp for the local copy. */
export async function applyEdit(
  account: Account,
  message: MessageRecord,
  newText: string,
): Promise<number> {
  await sendMessageAction(account, message, { kind: 'edit', newText })
  return nowSeconds()
}

/** Removes a message everywhere, including this device's own copy. */
export async function applyDelete(account: Account, message: MessageRecord): Promise<void> {
  await sendMessageAction(account, message, { kind: 'delete' })

  // The pin row points at the message; leaving it behind would make the banner
  // cycle through something that no longer exists.
  if (message.isPinned) {
    await unpinMessage(account.id, message.conversationId, message.envelopeId)
  }
}

/** Pins or unpins locally — nothing about pinning is ever sent to the server. */
export async function togglePin(account: Account, message: MessageRecord): Promise<boolean> {
  if (message.isPinned) {
    await unpinMessage(account.id, message.conversationId, message.envelopeId)
    return false
  }
  await pinMessage(account.id, message.conversationId, message.envelopeId)
  return true
}
