import { bytesToHex } from './hex'

/**
 * UUID version 7 — time-ordered, unlike the v4 that `crypto.randomUUID` returns.
 *
 * The payload contract asks for it, and the ordering is the point: ids issued
 * later sort later, so a message id carries its own place in time. That is what
 * lets `message_id` be the one logical identifier for a message while
 * `envelope_id` stays a per-device delivery detail — both are v7, so both sort
 * the way the conversation reads.
 */

const UUID_BYTES = 16

export function uuidV7(): string {
  const bytes = new Uint8Array(UUID_BYTES)
  // A DataView rather than indexing the array: every read and write here is a
  // byte-level operation with a known position, and `bytes[i]` is `number |
  // undefined` under `noUncheckedIndexedAccess` for no good reason.
  const view = new DataView(bytes.buffer)

  const timestamp = Date.now()
  // 48-bit big-endian milliseconds, written as two halves because a single
  // 48-bit integer does not exist here and the bitwise operators are 32-bit.
  view.setUint16(0, Math.floor(timestamp / 2 ** 32))
  view.setUint32(2, timestamp % 2 ** 32)

  crypto.getRandomValues(bytes.subarray(6))

  // Version 7 in the high nibble of byte 6.
  view.setUint8(6, (view.getUint8(6) & 0x0f) | 0x70)
  // RFC 4122 variant in the top two bits of byte 8.
  view.setUint8(8, (view.getUint8(8) & 0x3f) | 0x80)

  const hex = bytesToHex(bytes)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** True for any UUID-shaped string; used to reject the junk a peer may send. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
