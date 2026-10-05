import type { EditPayload, MessagePayload, ReactionPayload } from '../crypto/payloads'
import { buildMessageRecord, handleEnvelope } from '../crypto/receive'
import type { MessageRecord } from '../storage/db'
import {
  deleteMessage,
  getMessageByMessageId,
  saveMessage,
  updateMessage,
} from '../storage/messages'
import { unpinMessage } from '../storage/pinned'
import type { Account, Envelope, Reaction } from '../types'
import { nowSeconds } from '../utils/time'
import type { IdentityChange } from '../wasm'

/**
 * What the store does with one delivered envelope.
 *
 * Expressed as callbacks rather than taking the store itself, so this module has
 * no dependency on the store's shape (and therefore no cycle), and so the whole
 * receive path can be exercised with a plain object in a test.
 */

export type EnvelopeApplyContext = {
  account: Account
  isConversationOpen: (conversationId: string) => boolean
  /** Updates the open window. Called with an updater so the caller owns the ordering. */
  updateMessages: (update: (messages: MessageRecord[]) => MessageRecord[]) => void
  setIdentityChanges: (changes: IdentityChange[]) => void
  setError: (message: string) => void
  /** Called once a message row has been written. */
  onMessageStored: () => void
  /** Acknowledges the envelope; called after the message is stored. */
  ack: (envelopeId: string) => Promise<void>
}

export async function applyReceivedEnvelope(
  envelope: Envelope,
  context: EnvelopeApplyContext,
): Promise<void> {
  try {
    const received = await handleEnvelope(context.account, envelope)

    if (received.identityChanges.length > 0) {
      context.setIdentityChanges(received.identityChanges)
    }

    switch (received.kind) {
      case 'message':
        await storeIncoming(envelope, received.payload, context)
        break
      case 'edit':
        await applyEdit(received.payload, envelope.conversationId, context)
        break
      case 'delete':
        await applyDelete(received.payload, envelope.conversationId, context)
        break
      case 'reaction':
        await applyReaction(received.payload, envelope.senderAccountId, envelope.conversationId, context)
        break
      case 'call':
        // WebRTC signalling belongs to the call layer, which subscribes to the
        // socket itself; the store has nothing to do with an offer.
        console.info('[state] call signalling envelope received')
        break
      case 'sender_key':
      case 'attachment_key':
      case 'ignored':
        // Applied inside `handleEnvelope` (module state, attachment keys), or
        // deliberately not understood.
        break
    }
  } catch (error) {
    // A pairwise envelope never becomes decryptable later, so the failure is
    // recorded and the envelope is still acknowledged below — otherwise the
    // server would replay it on every connect, forever.
    console.error('[state] could not process an envelope', error)
    context.setError(describe(error))
  }

  try {
    // Acknowledged only after the message is stored: a crash in between costs a
    // redelivery rather than a lost message.
    await context.ack(envelope.envelopeId)
  } catch (error) {
    console.error('[state] could not acknowledge an envelope', error)
  }
}

/**
 * Writes a message that arrived.
 *
 * An envelope sent by this same account — a copy addressed to one of our other
 * devices — is stored exactly like a peer's: it is our own message either way,
 * and `senderAccountId` is what tells the unread count and the notification path
 * to leave it alone.
 *
 * The server timestamp is the sender's clock until an upload receipt says
 * otherwise; the live frame carries no server stamp of its own.
 */
async function storeIncoming(
  envelope: Envelope,
  payload: MessagePayload,
  context: EnvelopeApplyContext,
): Promise<void> {
  const conversationId = envelope.conversationId
  if (conversationId === null) {
    console.warn('[state] a message envelope arrived without a conversation')
    return
  }

  const record = buildMessageRecord(
    context.account,
    conversationId,
    envelope,
    payload,
    'sent',
    envelope.clientTimestamp,
  )

  await saveMessage(record)
  context.onMessageStored()

  if (context.isConversationOpen(conversationId)) {
    context.updateMessages((messages) => mergeById([record], messages))
  }
}

/**
 * Applies an edit from a peer.
 *
 * Addressed by the logical message id, so this works for a message this device
 * sent as well as one it received — which is exactly what the envelope-id scheme
 * could not do without the sender keeping a per-device map.
 */
async function applyEdit(
  payload: EditPayload,
  conversationId: string | null,
  context: EnvelopeApplyContext,
): Promise<void> {
  const record = await findTarget(payload.target_message_id, conversationId, context)
  if (record === null) {
    return
  }

  const editedAt = payload.edited_at > 0 ? payload.edited_at : nowSeconds()
  const patch = { plaintext: payload.new_text, editedAt }

  await updateMessage(context.account.id, record.envelopeId, patch)
  context.updateMessages((messages) =>
    patchByMessageId(messages, payload.target_message_id, (message) => ({ ...message, ...patch })),
  )
}

async function applyDelete(
  payload: { target_message_id: string },
  conversationId: string | null,
  context: EnvelopeApplyContext,
): Promise<void> {
  const record = await findTarget(payload.target_message_id, conversationId, context)
  if (record === null) {
    return
  }

  // The pin row points at the message, so it has to go first: a banner cycling
  // through deleted messages would be worse than no banner at all.
  await unpinMessage(context.account.id, record.conversationId, record.messageId, record.envelopeId)
  await deleteMessage(context.account.id, record.envelopeId)
  context.updateMessages((messages) =>
    messages.filter((message) => message.messageId !== payload.target_message_id),
  )
}

/**
 * Applies a reaction change.
 *
 * The actor is taken from the envelope, not from this account: a reaction is
 * announced for whoever made it, and attributing a peer's to us would show our
 * own name on somebody else's emoji.
 */
async function applyReaction(
  payload: ReactionPayload,
  actorAccountId: string,
  conversationId: string | null,
  context: EnvelopeApplyContext,
): Promise<void> {
  const record = await findTarget(payload.target_message_id, conversationId, context)
  if (record === null) {
    return
  }

  const removal = payload.emoji === null
  const reaction: Reaction = {
    actorId: actorAccountId,
    emoji: payload.emoji ?? '',
    createdAt: payload.created_at > 0 ? payload.created_at : nowSeconds(),
  }
  const others = record.reactions.filter((existing) => existing.actorId !== actorAccountId)
  const reactions = removal ? others : [...others, reaction]

  await updateMessage(context.account.id, record.envelopeId, { reactions })
  context.updateMessages((messages) =>
    patchByMessageId(messages, payload.target_message_id, (message) => ({ ...message, reactions })),
  )
}

/**
 * The local row an edit, a delete or a reaction is about.
 *
 * `null` is normal and not an error: the envelope may name a message this device
 * never received — an edit for something sent before it joined, or a message
 * that has already been deleted here.
 */
async function findTarget(
  messageId: string,
  conversationId: string | null,
  context: EnvelopeApplyContext,
): Promise<MessageRecord | null> {
  if (conversationId === null) {
    return null
  }
  return getMessageByMessageId(context.account.id, conversationId, messageId)
}

function patchByMessageId(
  messages: MessageRecord[],
  messageId: string,
  patch: (message: MessageRecord) => MessageRecord,
): MessageRecord[] {
  return messages.map((message) => (message.messageId === messageId ? patch(message) : message))
}

/** Newest first, one row per envelope id. */
export function mergeById(
  primary: MessageRecord[],
  secondary: MessageRecord[],
): MessageRecord[] {
  const byId = new Map<string, MessageRecord>()
  for (const message of [...primary, ...secondary]) {
    byId.set(message.envelopeId, message)
  }
  return [...byId.values()].sort((left, right) => right.clientTimestamp - left.clientTimestamp)
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
