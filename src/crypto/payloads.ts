import type { ForwardRef, ReplyRef } from '../types'
import { utf8ToHex } from '../utils/hex'

/**
 * The JSON payload contract every message carries inside its ciphertext.
 *
 * The server never sees any of this — it holds envelopes, not their contents —
 * so the shape is an agreement between clients rather than part of the HTTP API.
 * Each payload is a JSON object with a `kind` discriminator, which is what makes
 * the format extensible: a client that meets an unknown kind ignores it instead
 * of guessing.
 *
 * Every payload names the *logical* message it concerns by `message_id`, the one
 * identifier that is identical in all the copies sent to all devices. The
 * per-device `envelope_id` is a delivery detail and never appears in here.
 */

/** Wire shape: the field names a peer writes, which are snake_case. */
export type WireReply = {
  message_id: string
  /** A short excerpt, so the receiver can render the quote without a lookup. */
  preview?: string | null
  sender_account_id?: string | null
}

/** See `WireReply`. */
export type WireForward = {
  original_message_id: string
  original_conversation_id: string
  original_sender_account_id: string
  original_sender_display: string | null
  original_created_at: number
}

export type MessagePayload = {
  kind: 'message'
  message_id: string
  text: string
  reply_to: WireReply | null
  forward_from: WireForward | null
  attachment_ids: string[]
  created_at: number
}

export type EditPayload = {
  kind: 'edit'
  target_message_id: string
  new_text: string
  edited_at: number
}

export type DeletePayload = {
  kind: 'delete'
  target_message_id: string
  deleted_at: number
}

/** `emoji: null` takes this account's reaction back; there is no other signal. */
export type ReactionPayload = {
  kind: 'reaction'
  target_message_id: string
  emoji: string | null
  created_at: number
}

export type AttachmentKeyPayload = {
  kind: 'attachment_key'
  attachment_id: string
  key_hex: string
  base_nonce_hex: string
  conversation_id: string | null
}

/** Everything a message envelope can carry, once its ciphertext is opened. */
export type KnownPayload =
  | MessagePayload
  | EditPayload
  | DeletePayload
  | ReactionPayload
  | AttachmentKeyPayload

/** WebRTC signalling; the envelope type says which of the five frames it is. */
export type CallPayload = {
  call_id: string
  kind: 'offer' | 'answer' | 'ice' | 'hangup' | 'reject'
  sdp: string | null
  candidate: unknown
  reason: string | null
}

export function encodePayload(payload: object): string {
  return utf8ToHex(JSON.stringify(payload))
}

/**
 * Reads one decrypted payload.
 *
 * `null` for anything that is not a known shape: a peer on an older build, a
 * kind this version does not implement, or plain corruption. The caller logs it
 * and moves on — the envelope still has to be acknowledged, or the server would
 * replay it forever.
 */
export function parseKnownPayload(value: unknown): KnownPayload | null {
  if (!isRecord(value)) {
    return null
  }

  switch (value['kind']) {
    case 'message':
      return parseMessage(value)
    case 'edit':
      return parseEdit(value)
    case 'delete':
      return parseDelete(value)
    case 'reaction':
      return parseReaction(value)
    case 'attachment_key':
      return parseAttachmentKey(value)
    default:
      return null
  }
}

/** Reads a call signalling frame, which shares the `kind` field but not the union. */
export function parseCallPayload(value: unknown): CallPayload | null {
  if (!isRecord(value) || typeof value['call_id'] !== 'string') {
    return null
  }
  const kind = value['kind']
  if (kind !== 'offer' && kind !== 'answer' && kind !== 'ice' && kind !== 'hangup' && kind !== 'reject') {
    return null
  }

  return {
    call_id: value['call_id'],
    kind,
    sdp: optionalString(value['sdp']),
    candidate: value['candidate'] ?? null,
    reason: optionalString(value['reason']),
  }
}

function parseMessage(value: Record<string, unknown>): MessagePayload | null {
  const messageId = value['message_id']
  const text = value['text']
  if (typeof messageId !== 'string' || typeof text !== 'string') {
    return null
  }

  return {
    kind: 'message',
    message_id: messageId,
    text,
    reply_to: parseReply(value['reply_to']),
    forward_from: parseForward(value['forward_from']),
    attachment_ids: stringArray(value['attachment_ids']),
    created_at: numberOr(value['created_at'], 0),
  }
}

function parseEdit(value: Record<string, unknown>): EditPayload | null {
  const target = value['target_message_id']
  const text = value['new_text']
  if (typeof target !== 'string' || typeof text !== 'string') {
    return null
  }
  return {
    kind: 'edit',
    target_message_id: target,
    new_text: text,
    edited_at: numberOr(value['edited_at'], 0),
  }
}

function parseDelete(value: Record<string, unknown>): DeletePayload | null {
  const target = value['target_message_id']
  if (typeof target !== 'string') {
    return null
  }
  return { kind: 'delete', target_message_id: target, deleted_at: numberOr(value['deleted_at'], 0) }
}

function parseReaction(value: Record<string, unknown>): ReactionPayload | null {
  const target = value['target_message_id']
  // `null` is meaningful here — it removes the reaction — so the check is for
  // "neither a string nor null" rather than for falsiness.
  if (typeof target !== 'string' || (typeof value['emoji'] !== 'string' && value['emoji'] !== null)) {
    return null
  }
  return {
    kind: 'reaction',
    target_message_id: target,
    emoji: value['emoji'],
    created_at: numberOr(value['created_at'], 0),
  }
}

function parseAttachmentKey(value: Record<string, unknown>): AttachmentKeyPayload | null {
  const attachmentId = value['attachment_id']
  const keyHex = value['key_hex']
  const baseNonce = value['base_nonce_hex']
  if (
    typeof attachmentId !== 'string' ||
    typeof keyHex !== 'string' ||
    typeof baseNonce !== 'string'
  ) {
    return null
  }
  return {
    kind: 'attachment_key',
    attachment_id: attachmentId,
    key_hex: keyHex,
    base_nonce_hex: baseNonce,
    conversation_id: optionalString(value['conversation_id']),
  }
}

function parseReply(value: unknown): WireReply | null {
  if (!isRecord(value) || typeof value['message_id'] !== 'string') {
    return null
  }
  return {
    message_id: value['message_id'],
    preview: optionalString(value['preview']),
    sender_account_id: optionalString(value['sender_account_id']),
  }
}

function parseForward(value: unknown): WireForward | null {
  if (!isRecord(value)) {
    return null
  }
  const messageId = value['original_message_id']
  const conversationId = value['original_conversation_id']
  const senderId = value['original_sender_account_id']
  if (
    typeof messageId !== 'string' ||
    typeof conversationId !== 'string' ||
    typeof senderId !== 'string'
  ) {
    return null
  }
  return {
    original_message_id: messageId,
    original_conversation_id: conversationId,
    original_sender_account_id: senderId,
    original_sender_display: optionalString(value['original_sender_display']),
    original_created_at: numberOr(value['original_created_at'], 0),
  }
}

/**
 * The same quote, in the shape the local record stores.
 *
 * The wire speaks snake_case and the store speaks camelCase, and the two must
 * not drift; keeping the conversion next to the wire types is what keeps a
 * renamed field from compiling quietly into the wrong one.
 */
export function toDomainReply(reply: WireReply | null): ReplyRef | null {
  if (reply === null) {
    return null
  }
  return {
    messageId: reply.message_id,
    preview: reply.preview ?? null,
    senderAccountId: reply.sender_account_id ?? null,
  }
}

/** See `toDomainReply`. */
export function toDomainForward(forward: WireForward | null): ForwardRef | null {
  if (forward === null) {
    return null
  }
  return {
    originalMessageId: forward.original_message_id,
    originalConversationId: forward.original_conversation_id,
    originalSenderAccountId: forward.original_sender_account_id,
    originalSenderDisplay: forward.original_sender_display,
    originalCreatedAt: forward.original_created_at,
  }
}

/** The same quote, in the shape a peer receives. */
export function toWireReply(reply: ReplyRef | null): WireReply | null {
  if (reply === null) {
    return null
  }
  return {
    message_id: reply.messageId,
    preview: reply.preview,
    sender_account_id: reply.senderAccountId,
  }
}

/** See `toWireReply`. */
export function toWireForward(forward: ForwardRef | null): WireForward | null {
  if (forward === null) {
    return null
  }
  return {
    original_message_id: forward.originalMessageId,
    original_conversation_id: forward.originalConversationId,
    original_sender_account_id: forward.originalSenderAccountId,
    original_sender_display: forward.originalSenderDisplay,
    original_created_at: forward.originalCreatedAt,
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
