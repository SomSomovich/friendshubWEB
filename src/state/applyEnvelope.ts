import { isRecordWithKind, type SyncSentPayload } from '../crypto/envelopes'
import { buildMessageRecord, handleEnvelope } from '../crypto/receive'
import type { MessageRecord } from '../storage/db'
import {
  addReaction,
  deleteMessage,
  removeReaction,
  saveMessage,
  updateMessage,
} from '../storage/messages'
import { unpinMessage } from '../storage/pinned'
import type { Account, Envelope, Reaction } from '../types'
import { hexToUtf8 } from '../utils/hex'
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
      case 'message': {
        await storeIncoming(envelope, received.plaintext ?? '', context)
        break
      }
      case 'sync': {
        const payload = received.payload
        const conversationId =
          envelope.conversationId ??
          (isRecordWithKind(payload, 'sync_sent')
            ? ((payload as Partial<SyncSentPayload>).conversation_id ?? null)
            : null)
        if (conversationId === null) {
          console.warn('[state] a sync copy arrived without a conversation')
          break
        }
        // The text is this account's own message, sent from another device, so it
        // belongs in the thread like any other.
        await storeIncoming({ ...envelope, conversationId }, received.plaintext ?? '', context)
        break
      }
      case 'edit': {
        await applyEdit(received.payload, context)
        break
      }
      case 'delete': {
        await applyDelete(received.payload, envelope.conversationId, context)
        break
      }
      case 'reaction': {
        await applyReaction(received.payload, context)
        break
      }
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

async function storeIncoming(
  envelope: Envelope,
  plaintext: string,
  context: EnvelopeApplyContext,
): Promise<void> {
  const conversationId = envelope.conversationId
  if (conversationId === null) {
    console.warn('[state] a message envelope arrived without a conversation')
    return
  }

  // The live frame carries no server timestamp — only the history endpoint does —
  // so the sender's clock is the best ordering key available.
  const record = buildMessageRecord(
    context.account,
    conversationId,
    envelope,
    plaintext,
    'sent',
    envelope.clientTimestamp,
  )

  await saveMessage(record)

  context.onMessageStored()

  if (context.isConversationOpen(conversationId)) {
    context.updateMessages((messages) => mergeById([record], messages))
  }
}

async function applyEdit(payload: unknown, context: EnvelopeApplyContext): Promise<void> {
  if (!isRecordWithKind(payload, 'edit')) {
    return
  }
  const targetId = payload['target_envelope_id']
  const newHex = payload['new_plaintext_hex']
  if (typeof targetId !== 'string' || typeof newHex !== 'string') {
    return
  }

  const plaintext = hexToUtf8(newHex)
  const editedAt = nowSeconds()
  await updateMessage(context.account.id, targetId, { plaintext, editedAt })
  context.updateMessages((messages) =>
    patchById(messages, targetId, (message) => ({ ...message, plaintext, editedAt })),
  )
}

async function applyDelete(
  payload: unknown,
  conversationId: string | null,
  context: EnvelopeApplyContext,
): Promise<void> {
  if (!isRecordWithKind(payload, 'delete')) {
    return
  }
  const targetId = payload['target_envelope_id']
  if (typeof targetId !== 'string') {
    return
  }

  // The pin row points at the message, so it has to go first: a banner cycling
  // through deleted messages would be worse than no banner at all.
  if (conversationId !== null) {
    await unpinMessage(context.account.id, conversationId, targetId)
  }

  await deleteMessage(context.account.id, targetId)
  context.updateMessages((messages) => messages.filter((message) => message.envelopeId !== targetId))
}

async function applyReaction(payload: unknown, context: EnvelopeApplyContext): Promise<void> {
  if (!isRecordWithKind(payload, 'reaction')) {
    return
  }
  const targetId = payload['target_envelope_id']
  const emoji = payload['emoji']
  if (typeof targetId !== 'string' || typeof emoji !== 'string') {
    return
  }

  const actorId = context.account.id
  const remove = payload['remove'] === true
  const reaction: Reaction = { actorId, emoji, createdAt: nowSeconds() }

  if (remove) {
    await removeReaction(context.account.id, targetId, actorId)
  } else {
    await addReaction(context.account.id, targetId, reaction)
  }

  context.updateMessages((messages) =>
    patchById(messages, targetId, (message) => ({
      ...message,
      reactions: remove
        ? message.reactions.filter((existing) => existing.actorId !== actorId)
        : [
            ...message.reactions.filter((existing) => existing.actorId !== actorId),
            reaction,
          ],
    })),
  )
}

function patchById(
  messages: MessageRecord[],
  envelopeId: string,
  patch: (message: MessageRecord) => MessageRecord,
): MessageRecord[] {
  return messages.map((message) => (message.envelopeId === envelopeId ? patch(message) : message))
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
