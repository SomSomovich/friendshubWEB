import { setAttachmentKey } from '../storage/attachments'
import type { MessageRecord } from '../storage/db'
import type { Account, Envelope, MessageStatus } from '../types'
import { hexToUtf8 } from '../utils/hex'
import { nowSeconds } from '../utils/time'
import {
  decrypt,
  groupDecrypt,
  identityChanges,
  processSenderKeyDistribution,
  type IdentityChange,
} from '../wasm'
import { isGroupCiphertext } from '../ws/envelope'
import {
  ENVELOPE_TYPE_ATTACHMENT_KEY,
  ENVELOPE_TYPE_CALL_ANSWER,
  ENVELOPE_TYPE_CALL_HANGUP,
  ENVELOPE_TYPE_CALL_ICE,
  ENVELOPE_TYPE_CALL_OFFER,
  ENVELOPE_TYPE_CALL_REJECT,
  ENVELOPE_TYPE_DELETE,
  ENVELOPE_TYPE_EDIT,
  ENVELOPE_TYPE_MESSAGE,
  ENVELOPE_TYPE_REACTION,
  ENVELOPE_TYPE_SENDER_KEY,
  ENVELOPE_TYPE_SYNC,
  envelopeTypeName,
} from '../ws/envelopeTypes'
import {
  isRecord,
  parseCallPayload,
  parseKnownPayload,
  toDomainForward,
  toDomainReply,
  type AttachmentKeyPayload,
  type CallPayload,
  type DeletePayload,
  type EditPayload,
  type MessagePayload,
  type ReactionPayload,
} from './payloads'
import { persistSnapshot } from './snapshot'

/**
 * The receive path: one envelope in, one decoded payload out.
 *
 * Nothing here touches the UI or the message store. The caller decides what an
 * edit or a call offer means for its own state — this layer only decrypts,
 * applies what the module owns (sender keys, attachment keys) and reports the rest.
 */

export type ReceivedEnvelope =
  | { kind: 'message'; envelope: Envelope; payload: MessagePayload; identityChanges: IdentityChange[] }
  | { kind: 'edit'; envelope: Envelope; payload: EditPayload; identityChanges: IdentityChange[] }
  | { kind: 'delete'; envelope: Envelope; payload: DeletePayload; identityChanges: IdentityChange[] }
  | { kind: 'reaction'; envelope: Envelope; payload: ReactionPayload; identityChanges: IdentityChange[] }
  | {
      kind: 'attachment_key'
      envelope: Envelope
      payload: AttachmentKeyPayload
      identityChanges: IdentityChange[]
    }
  | { kind: 'call'; envelope: Envelope; payload: CallPayload | null; identityChanges: IdentityChange[] }
  | { kind: 'sender_key' | 'ignored'; envelope: Envelope; identityChanges: IdentityChange[] }

export async function handleEnvelope(
  account: Account,
  envelope: Envelope,
): Promise<ReceivedEnvelope> {
  const result = await route(account, envelope)
  const changes = await identityChanges(account.id)
  return { ...result, identityChanges: changes } as ReceivedEnvelope
}

type RoutedResult =
  | Omit<Extract<ReceivedEnvelope, { kind: 'message' }>, 'identityChanges'>
  | Omit<Extract<ReceivedEnvelope, { kind: 'edit' }>, 'identityChanges'>
  | Omit<Extract<ReceivedEnvelope, { kind: 'delete' }>, 'identityChanges'>
  | Omit<Extract<ReceivedEnvelope, { kind: 'reaction' }>, 'identityChanges'>
  | Omit<Extract<ReceivedEnvelope, { kind: 'attachment_key' }>, 'identityChanges'>
  | Omit<Extract<ReceivedEnvelope, { kind: 'call' }>, 'identityChanges'>
  | Omit<Extract<ReceivedEnvelope, { kind: 'sender_key' | 'ignored' }>, 'identityChanges'>

/**
 * The message row for an envelope that was just decrypted.
 *
 * Shared with the saved-history loader, which replays the same path over
 * historical envelopes — the fields that come off the wire must not be assembled
 * in two different places.
 */
export function buildMessageRecord(
  account: Account,
  conversationId: string,
  envelope: Envelope,
  payload: MessagePayload,
  status: MessageStatus,
  serverTimestamp: number,
): MessageRecord {
  return {
    messageId: payload.message_id,
    envelopeId: envelope.envelopeId,
    accountId: account.id,
    conversationId,
    senderAccountId: envelope.senderAccountId,
    senderDeviceNumber: envelope.senderDeviceNumber,
    recipientAccountId: account.id,
    recipientDeviceNumber: envelope.recipientDeviceNumber,
    envelopeType: envelope.envelopeType,
    plaintext: payload.text,
    decryptedAt: nowSeconds(),
    clientTimestamp: envelope.clientTimestamp,
    serverTimestamp,
    attachments: payload.attachment_ids,
    replyTo: toDomainReply(payload.reply_to),
    forwardFrom: toDomainForward(payload.forward_from),
    editedAt: null,
    isPinned: false,
    reactions: [],
    status,
  }
}

async function route(account: Account, envelope: Envelope): Promise<RoutedResult> {
  switch (envelope.envelopeType) {
    case ENVELOPE_TYPE_MESSAGE: {
      // A group ciphertext is one sender-key message for the whole group; a
      // pairwise one is a SignalMessage or a prekey message. The module's first
      // byte says which — see `GROUP_CIPHERTEXT_PREFIX`.
      const plaintextHex = isGroupCiphertext(envelope.ciphertext)
        ? await groupDecrypt(
            account.id,
            envelope.senderAccountId,
            envelope.senderDeviceNumber,
            envelope.ciphertext,
          )
        : await decrypt(
            account.id,
            envelope.senderAccountId,
            envelope.senderDeviceNumber,
            account.deviceNumber,
            envelope.ciphertext,
            envelope.isPrekeyMessage,
          )
      await persistSnapshot(account.id)

      const payload = parseKnownPayload(parseJson(plaintextHex))
      if (payload !== null && payload.kind === 'message') {
        return { kind: 'message', envelope, payload }
      }
      // Anything else that decrypts: treated as plain text rather than dropped.
      // A peer on an older build sends raw UTF-8, and losing the words to a
      // format change would be a poor trade for a tidier parser.
      return { kind: 'message', envelope, payload: asPlainText(envelope, plaintextHex) }
    }

    case ENVELOPE_TYPE_SYNC: {
      // Only ever sent by builds from before the payload contract — this client
      // now addresses a real message envelope to its own other devices. Handled
      // anyway, because an unacknowledged copy from before the upgrade can still
      // arrive, and it carries words somebody wrote.
      const plaintextHex = await decryptPairwise(account, envelope)
      await persistSnapshot(account.id)

      const legacy = parseJson(plaintextHex)
      if (!isRecord(legacy) || typeof legacy['plaintext_hex'] !== 'string') {
        return { kind: 'ignored', envelope }
      }
      return { kind: 'message', envelope, payload: asPlainText(envelope, legacy['plaintext_hex']) }
    }

    case ENVELOPE_TYPE_SENDER_KEY: {
      await processSenderKeyDistribution(
        account.id,
        envelope.senderAccountId,
        envelope.senderDeviceNumber,
        envelope.ciphertext,
      )
      await persistSnapshot(account.id)
      return { kind: 'sender_key', envelope }
    }

    case ENVELOPE_TYPE_EDIT:
    case ENVELOPE_TYPE_DELETE:
    case ENVELOPE_TYPE_REACTION: {
      const payload = parseKnownPayload(parseJson(await decryptPairwise(account, envelope)))
      await persistSnapshot(account.id)

      if (payload === null) {
        return { kind: 'ignored', envelope }
      }
      switch (payload.kind) {
        case 'edit':
          return { kind: 'edit', envelope, payload }
        case 'delete':
          return { kind: 'delete', envelope, payload }
        case 'reaction':
          return { kind: 'reaction', envelope, payload }
        default:
          // An attachment key or a message inside an edit envelope: not what the
          // type promises, so it is dropped rather than guessed at.
          return { kind: 'ignored', envelope }
      }
    }

    case ENVELOPE_TYPE_ATTACHMENT_KEY: {
      const decoded = parseKnownPayload(parseJson(await decryptPairwise(account, envelope)))
      await persistSnapshot(account.id)

      if (decoded === null || decoded.kind !== 'attachment_key') {
        return { kind: 'ignored', envelope }
      }
      await setAttachmentKey(
        account.id,
        decoded.attachment_id,
        decoded.key_hex,
        decoded.base_nonce_hex,
        decoded.conversation_id,
      )
      return { kind: 'attachment_key', envelope, payload: decoded }
    }

    case ENVELOPE_TYPE_CALL_OFFER:
    case ENVELOPE_TYPE_CALL_ANSWER:
    case ENVELOPE_TYPE_CALL_ICE:
    case ENVELOPE_TYPE_CALL_HANGUP:
    case ENVELOPE_TYPE_CALL_REJECT: {
      const payload = parseCallPayload(parseJson(await decryptPairwise(account, envelope)))
      await persistSnapshot(account.id)
      return { kind: 'call', envelope, payload }
    }

    default:
      console.warn(
        `[crypto] ignoring envelope type ${envelope.envelopeType} (${envelopeTypeName(envelope.envelopeType)})`,
      )
      return { kind: 'ignored', envelope }
  }
}

/**
 * A message payload for text that did not arrive as one.
 *
 * The envelope's own id becomes the logical id: it is unique and stable, which
 * is all a message needs to be replyable and editable — it simply will not match
 * the same message on another device, which an old sender could not have made
 * match either.
 */
function asPlainText(envelope: Envelope, plaintextHex: string): MessagePayload {
  return {
    kind: 'message',
    message_id: envelope.envelopeId,
    text: hexToUtf8(plaintextHex),
    reply_to: null,
    forward_from: null,
    attachment_ids: [],
    created_at: envelope.clientTimestamp,
  }
}

/** Sync, control and signalling envelopes are always pairwise encrypted. */
async function decryptPairwise(account: Account, envelope: Envelope): Promise<string> {
  return decrypt(
    account.id,
    envelope.senderAccountId,
    envelope.senderDeviceNumber,
    account.deviceNumber,
    envelope.ciphertext,
    envelope.isPrekeyMessage,
  )
}

/**
 * Parses a decrypted JSON payload.
 *
 * A payload that is not JSON is reported as `null` rather than thrown: the
 * envelope still has to be acknowledged, and dropping it would make the server
 * replay it forever.
 */
function parseJson(plaintextHex: string): unknown {
  try {
    return JSON.parse(hexToUtf8(plaintextHex))
  } catch (error) {
    console.warn('[crypto] a decrypted payload is not JSON', error)
    return null
  }
}
