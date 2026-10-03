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
import { isRecordWithKind, type SyncSentPayload } from './envelopes'
import { persistSnapshot } from './snapshot'

/**
 * The receive path: one envelope in, one decoded result out.
 *
 * Nothing here touches the UI or the message store. The caller decides what a
 * sync copy, an edit or a call offer means for its own state — this layer only
 * decrypts, applies what the module owns (sender keys, attachment keys) and
 * reports the rest.
 */

export type ReceivedKind =
  | 'message'
  | 'sync'
  | 'sender_key'
  | 'edit'
  | 'delete'
  | 'reaction'
  | 'attachment_key'
  | 'call'
  | 'ignored'

export type ReceivedEnvelope = {
  envelope: Envelope
  kind: ReceivedKind
  /**
   * The text of a message, or — for a sync copy — the original text this device
   * sent from elsewhere. `null` for everything else.
   */
  plaintext: string | null
  /** Decoded JSON payload for the envelope kinds that carry one. */
  payload: unknown
  /**
   * Peer identity keys that changed while decrypting (WASM_API.txt §4.5). The
   * journal is not cleared here: only the user can acknowledge the warning.
   */
  identityChanges: IdentityChange[]
}

export async function handleEnvelope(
  account: Account,
  envelope: Envelope,
): Promise<ReceivedEnvelope> {
  const result = await route(account, envelope)
  const changes = await identityChanges(account.id)
  return { ...result, identityChanges: changes }
}

type RoutedResult = Omit<ReceivedEnvelope, 'identityChanges'>

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
  plaintext: string,
  status: MessageStatus,
  serverTimestamp: number,
): MessageRecord {
  return {
    envelopeId: envelope.envelopeId,
    accountId: account.id,
    conversationId,
    senderAccountId: envelope.senderAccountId,
    senderDeviceNumber: envelope.senderDeviceNumber,
    recipientAccountId: account.id,
    recipientDeviceNumber: envelope.recipientDeviceNumber,
    envelopeType: envelope.envelopeType,
    plaintext,
    decryptedAt: nowSeconds(),
    clientTimestamp: envelope.clientTimestamp,
    serverTimestamp,
    // The attachment ids are not part of a message's plaintext (which is raw
    // UTF-8); they are correlated through the attachment-key payload instead.
    attachments: [],
    replyToEnvelopeId: null,
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
      return { envelope, kind: 'message', plaintext: hexToUtf8(plaintextHex), payload: null }
    }

    case ENVELOPE_TYPE_SYNC: {
      const plaintextHex = await decryptPairwise(account, envelope)
      await persistSnapshot(account.id)
      const payload = parsePayload(plaintextHex)
      const synced =
        isRecordWithKind(payload, 'sync_sent') &&
        typeof (payload as Partial<SyncSentPayload>).plaintext_hex === 'string'
          ? hexToUtf8((payload as SyncSentPayload).plaintext_hex)
          : null
      return { envelope, kind: 'sync', plaintext: synced, payload }
    }

    case ENVELOPE_TYPE_SENDER_KEY: {
      await processSenderKeyDistribution(
        account.id,
        envelope.senderAccountId,
        envelope.senderDeviceNumber,
        envelope.ciphertext,
      )
      await persistSnapshot(account.id)
      return { envelope, kind: 'sender_key', plaintext: null, payload: null }
    }

    case ENVELOPE_TYPE_EDIT:
    case ENVELOPE_TYPE_DELETE:
    case ENVELOPE_TYPE_REACTION: {
      const plaintextHex = await decryptPairwise(account, envelope)
      await persistSnapshot(account.id)
      return {
        envelope,
        kind: kindForControl(envelope.envelopeType),
        plaintext: null,
        payload: parsePayload(plaintextHex),
      }
    }

    case ENVELOPE_TYPE_ATTACHMENT_KEY: {
      const plaintextHex = await decryptPairwise(account, envelope)
      await persistSnapshot(account.id)
      const payload = parsePayload(plaintextHex)

      if (isRecordWithKind(payload, 'attachment_key')) {
        const { attachment_id: attachmentId, key_hex: keyHex, base_nonce_hex: baseNonce } = payload
        if (typeof attachmentId === 'string' && typeof keyHex === 'string' && typeof baseNonce === 'string') {
          const conversationId =
            typeof payload['conversation_id'] === 'string' ? payload['conversation_id'] : null
          await setAttachmentKey(account.id, attachmentId, keyHex, baseNonce, conversationId)
        } else {
          console.warn('[crypto] attachment key payload is missing fields', payload)
        }
      }

      return { envelope, kind: 'attachment_key', plaintext: null, payload }
    }

    case ENVELOPE_TYPE_CALL_OFFER:
    case ENVELOPE_TYPE_CALL_ANSWER:
    case ENVELOPE_TYPE_CALL_ICE:
    case ENVELOPE_TYPE_CALL_HANGUP:
    case ENVELOPE_TYPE_CALL_REJECT: {
      const plaintextHex = await decryptPairwise(account, envelope)
      await persistSnapshot(account.id)
      return { envelope, kind: 'call', plaintext: null, payload: parsePayload(plaintextHex) }
    }

    default:
      console.warn(
        `[crypto] ignoring envelope type ${envelope.envelopeType} (${envelopeTypeName(envelope.envelopeType)})`,
      )
      return { envelope, kind: 'ignored', plaintext: null, payload: null }
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

function kindForControl(envelopeType: number): ReceivedKind {
  switch (envelopeType) {
    case ENVELOPE_TYPE_EDIT:
      return 'edit'
    case ENVELOPE_TYPE_DELETE:
      return 'delete'
    default:
      return 'reaction'
  }
}

/**
 * Parses a decrypted JSON payload.
 *
 * A payload that is not JSON is reported as `null` rather than thrown: the
 * envelope still has to be acknowledged, and dropping it would make the server
 * replay it forever.
 */
function parsePayload(plaintextHex: string): unknown {
  try {
    const parsed: unknown = JSON.parse(hexToUtf8(plaintextHex))
    return parsed
  } catch (error) {
    console.error('[crypto] decrypted payload is not JSON', error)
    return null
  }
}
