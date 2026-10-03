import type { Envelope } from '../types'
import { bytesToHex, hexToBytes } from '../utils/hex'
import { GROUP_CIPHERTEXT_PREFIX } from './envelopeTypes'
import type { BotMessageEvent, ChannelPostEvent, PresenceEvent } from './events'
import { fh } from './proto/friendshub.js'

/**
 * Conversions between the app's envelope shape (UUID strings, hex ciphertext)
 * and the protobuf frame (raw bytes, int64 timestamps).
 */

const UUID_BYTES = 16
const UUID_HEX_LENGTH = UUID_BYTES * 2

export function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '')
  if (hex.length !== UUID_HEX_LENGTH) {
    throw new Error(`not a UUID: ${uuid}`)
  }
  return hexToBytes(hex)
}

export function bytesToUuid(bytes: Uint8Array): string {
  if (bytes.length !== UUID_BYTES) {
    throw new Error(`expected a 16-byte id, got ${bytes.length} bytes`)
  }
  const hex = bytesToHex(bytes)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Unwraps the value types protobufjs uses for 64-bit fields.
 *
 * int64 decodes into a `Long` object because protobufjs keeps it exact; every
 * value here (unix seconds) fits a plain number, so the object is unwrapped
 * without pulling `long` in as a dependency just for its type. Enums and
 * ordinary integers pass straight through.
 */
export function toPlainNumber(
  value: number | { toNumber: () => number } | null | undefined,
): number {
  if (value === null || value === undefined) {
    return 0
  }
  return typeof value === 'number' ? value : value.toNumber()
}

export function toProtoEnvelope(envelope: Envelope): fh.Envelope.$Properties {
  return {
    envelopeId: uuidToBytes(envelope.envelopeId),
    senderAccountId: uuidToBytes(envelope.senderAccountId),
    senderDeviceNumber: envelope.senderDeviceNumber,
    recipientAccountId: uuidToBytes(envelope.recipientAccountId),
    recipientDeviceNumber: envelope.recipientDeviceNumber,
    // The generated enum is a TS enum, so a plain number has to be asserted.
    envelopeType: envelope.envelopeType as fh.EnvelopeType,
    isPrekeyMessage: envelope.isPrekeyMessage,
    ciphertext: hexToBytes(envelope.ciphertext),
    clientTimestamp: envelope.clientTimestamp,
    // An empty `conversation_id` means "not in a chat".
    conversationId:
      envelope.conversationId === null
        ? new Uint8Array(0)
        : uuidToBytes(envelope.conversationId),
    senderIsBot: envelope.senderIsBot,
  }
}

export function fromProtoEnvelope(proto: fh.Envelope): Envelope {
  return {
    envelopeId: bytesToUuid(proto.envelopeId),
    senderAccountId: bytesToUuid(proto.senderAccountId),
    senderDeviceNumber: proto.senderDeviceNumber,
    recipientAccountId: bytesToUuid(proto.recipientAccountId),
    recipientDeviceNumber: proto.recipientDeviceNumber,
    envelopeType: toPlainNumber(proto.envelopeType),
    isPrekeyMessage: proto.isPrekeyMessage,
    ciphertext: bytesToHex(proto.ciphertext),
    clientTimestamp: toPlainNumber(proto.clientTimestamp),
    conversationId: proto.conversationId.length === 0 ? null : bytesToUuid(proto.conversationId),
    senderIsBot: proto.senderIsBot,
  }
}

export function toProtoEnvelopes(envelopes: Envelope[]): fh.Envelope.$Properties[] {
  return envelopes.map((envelope) => toProtoEnvelope(envelope))
}

export function fromProtoEnvelopes(envelopes: fh.Envelope[]): Envelope[] {
  return envelopes.map((envelope) => fromProtoEnvelope(envelope))
}

/**
 * Converts a delivery batch, dropping envelopes that cannot be converted.
 *
 * One malformed envelope (a missing id, a truncated UUID) must not throw away
 * the rest of the batch: the server redelivers anything unacknowledged, so the
 * damaged one comes back while the healthy ones are processed now.
 */
export function fromProtoEnvelopesLenient(envelopes: fh.Envelope[]): Envelope[] {
  const converted: Envelope[] = []
  for (const envelope of envelopes) {
    try {
      converted.push(fromProtoEnvelope(envelope))
    } catch (error) {
      console.error('[ws] skipping an envelope that could not be converted', error)
    }
  }
  return converted
}

export function toPresenceEvent(proto: fh.PresenceUpdate): PresenceEvent {
  return {
    accountId: bytesToUuid(proto.accountId),
    isOnline: proto.isOnline,
    lastSeen: proto.lastSeen === null || proto.lastSeen === undefined ? null : toPlainNumber(proto.lastSeen),
    customStatusText: proto.customStatusText ?? null,
    customStatusEmoji: proto.customStatusEmoji ?? null,
    customStatusExpiresAt:
      proto.customStatusExpiresAt === null || proto.customStatusExpiresAt === undefined
        ? null
        : toPlainNumber(proto.customStatusExpiresAt),
  }
}

export function toBotMessageEvent(proto: fh.BotMessageDelivery): BotMessageEvent {
  return {
    messageId: proto.messageId,
    botId: bytesToUuid(proto.botId),
    accountId: bytesToUuid(proto.accountId),
    text: proto.text,
    replyToMessageId: proto.replyToMessageId ?? null,
    createdAt: toPlainNumber(proto.createdAt),
  }
}

export function toChannelPostEvent(proto: fh.ChannelPostDelivery): ChannelPostEvent {
  return {
    postId: proto.postId,
    channelId: bytesToUuid(proto.channelId),
    authorType: proto.authorType,
    authorId: bytesToUuid(proto.authorId),
    text: proto.text,
    attachmentIds: proto.attachmentIds,
    replyToPostId: proto.replyToPostId ?? null,
    createdAt: toPlainNumber(proto.createdAt),
  }
}

export function encodeClientFrame(frame: fh.ClientFrame.$Properties): Uint8Array {
  return fh.ClientFrame.encode(frame).finish()
}

export function decodeServerFrame(bytes: Uint8Array): fh.ServerFrame {
  return fh.ServerFrame.decode(bytes)
}

/**
 * True when a type-1 ciphertext carries a group message rather than a pairwise
 * one — the receive path has to pick `group_decrypt` versus `decrypt`.
 */
export function isGroupCiphertext(ciphertextHex: string): boolean {
  const bytes = hexToBytes(ciphertextHex)
  return bytes[0] === GROUP_CIPHERTEXT_PREFIX
}
