import * as wasm from './pkg/friendshub_wasm.js'
import { mapAttachmentKey } from './parse'
import { call, parseWith, toChunkIndex } from './runtime'
import type { AttachmentKey } from './types'

/**
 * Attachment crypto. Only individual chunks are sealed/opened here; slicing the
 * file, uploading the chunks and assembling them again is the caller's job
 * (see `src/crypto/attachments.ts`).
 */

/**
 * Fresh symmetric key and base nonce for ONE attachment. The key travels to the
 * recipient in a separate `ENVELOPE_TYPE_ATTACHMENT_KEY` envelope — it is never
 * uploaded alongside the ciphertext.
 */
export function generateAttachmentKey(): Promise<AttachmentKey> {
  return call('generate_attachment_key', () =>
    parseWith('generate_attachment_key', wasm.generate_attachment_key(), mapAttachmentKey),
  )
}

/** Seals one chunk: ciphertext plus a 16-byte Poly1305 tag. */
export function sealChunk(
  keyHex: string,
  baseNonceHex: string,
  chunkIndex: number,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  return call('seal_chunk', () =>
    wasm.seal_chunk(keyHex, baseNonceHex, toChunkIndex(chunkIndex, 'seal_chunk'), plaintext),
  )
}

/** Opens one chunk. Throws (as `WasmError`) when authentication fails. */
export function openChunk(
  keyHex: string,
  baseNonceHex: string,
  chunkIndex: number,
  sealed: Uint8Array,
): Promise<Uint8Array> {
  return call('open_chunk', () =>
    wasm.open_chunk(keyHex, baseNonceHex, toChunkIndex(chunkIndex, 'open_chunk'), sealed),
  )
}
