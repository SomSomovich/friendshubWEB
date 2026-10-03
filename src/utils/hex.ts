/**
 * Hex and UTF-8 helpers for the WASM boundary.
 *
 * Everything crossing that boundary is hex-encoded text except binary blobs
 * (attachment chunks, protobuf byte fields), which stay `Uint8Array`.
 */

const HEX_PATTERN = /^[0-9a-fA-F]*$/

export function bytesToHex(bytes: Uint8Array): string {
  let hex = ''
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0')
  }
  return hex
}

/**
 * Throws on malformed input instead of silently producing a shorter buffer:
 * a bad hex string here means a corrupted payload or a programming error, and
 * both must surface rather than turn into "wrong plaintext" later.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !HEX_PATTERN.test(hex)) {
    throw new Error(`Invalid hex string (length ${hex.length})`)
  }

  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

const textEncoder = new TextEncoder()
// Not `fatal`: a peer can legitimately send text this decoder cannot represent,
// and mangled characters are preferable to dropping the whole message.
const textDecoder = new TextDecoder()

export function utf8ToBytes(text: string): Uint8Array {
  return textEncoder.encode(text)
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return textDecoder.decode(bytes)
}

export function utf8ToHex(text: string): string {
  return bytesToHex(textEncoder.encode(text))
}

export function hexToUtf8(hex: string): string {
  return textDecoder.decode(hexToBytes(hex))
}
