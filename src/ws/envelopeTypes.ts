import { fh } from './proto/friendshub.js'

/**
 * Envelope types come from the generated protobuf enum, not from hardcoded
 * numbers: the enum *is* the wire format, and a constant that drifts from it
 * would silently misroute messages.
 */

export const ENVELOPE_TYPE = fh.EnvelopeType

/** A user-visible or bot message, pairwise or group encrypted. */
export const ENVELOPE_TYPE_MESSAGE = fh.EnvelopeType.ENVELOPE_TYPE_MESSAGE

/** A copy of an own message, sent to the account's other devices. */
export const ENVELOPE_TYPE_SYNC = fh.EnvelopeType.ENVELOPE_TYPE_SYNC

/** Sender key distribution for a group conversation. */
export const ENVELOPE_TYPE_SENDER_KEY = fh.EnvelopeType.ENVELOPE_TYPE_SENDER_KEY

export const ENVELOPE_TYPE_EDIT = fh.EnvelopeType.ENVELOPE_TYPE_EDIT
export const ENVELOPE_TYPE_DELETE = fh.EnvelopeType.ENVELOPE_TYPE_DELETE
export const ENVELOPE_TYPE_REACTION = fh.EnvelopeType.ENVELOPE_TYPE_REACTION

/** Defined on the wire, not used by this client yet. */
export const ENVELOPE_TYPE_READ_RECEIPT = fh.EnvelopeType.ENVELOPE_TYPE_READ_RECEIPT
/** Defined on the wire, not used by this client yet. */
export const ENVELOPE_TYPE_TYPING = fh.EnvelopeType.ENVELOPE_TYPE_TYPING

/** Attachment symmetric key handed to the recipient. */
export const ENVELOPE_TYPE_ATTACHMENT_KEY = fh.EnvelopeType.ENVELOPE_TYPE_ATTACHMENT_KEY

export const ENVELOPE_TYPE_CALL_OFFER = fh.EnvelopeType.ENVELOPE_TYPE_CALL_OFFER
export const ENVELOPE_TYPE_CALL_ANSWER = fh.EnvelopeType.ENVELOPE_TYPE_CALL_ANSWER
export const ENVELOPE_TYPE_CALL_ICE = fh.EnvelopeType.ENVELOPE_TYPE_CALL_ICE
export const ENVELOPE_TYPE_CALL_HANGUP = fh.EnvelopeType.ENVELOPE_TYPE_CALL_HANGUP
export const ENVELOPE_TYPE_CALL_REJECT = fh.EnvelopeType.ENVELOPE_TYPE_CALL_REJECT

/** Bot traffic is delivered as its own server frame; the type exists for completeness. */
export const ENVELOPE_TYPE_BOT_MESSAGE = fh.EnvelopeType.ENVELOPE_TYPE_BOT_MESSAGE
/** Local-only pinning is never sent to the server; reserved on the wire. */
export const ENVELOPE_TYPE_PIN = fh.EnvelopeType.ENVELOPE_TYPE_PIN
/** See `ENVELOPE_TYPE_PIN`. */
export const ENVELOPE_TYPE_UNPIN = fh.EnvelopeType.ENVELOPE_TYPE_UNPIN

/** Debug label for an envelope type; unknown values are labelled, not dropped. */
export function envelopeTypeName(value: number): string {
  const name: unknown = fh.EnvelopeType[value]
  return typeof name === 'string' ? name : `UNKNOWN(${value})`
}

/**
 * `ciphertext[0]` of a group message, as the built module produces it.
 *
 * WASM_API.txt §6 says the marker is `0x03`, but the module emits `0x33` for
 * both a sender key distribution and a group message (verified against the
 * built module in Node and in a browser). Routing has to match the wire, so the
 * observed value wins; `0x03` would in fact be ambiguous, because libsignal's
 * pairwise messages start with their version byte `0x03` too.
 */
export const GROUP_CIPHERTEXT_PREFIX = 0x33
