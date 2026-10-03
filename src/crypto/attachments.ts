import {
  claimAttachment,
  fetchAttachmentChunk,
  finalizeAttachment,
  getAttachmentChunks,
  initAttachment,
  putAttachmentChunk,
  recommendChunkSize,
  type AttachmentKind,
} from '../api/attachments'
import { ApiError } from '../api/errors'
import { saveAttachment } from '../storage/attachments'
import type { AttachmentRecord } from '../storage/db'
import type { Account } from '../types'
import { asBinaryPayload } from '../utils/bytes'
import { utf8ToHex } from '../utils/hex'
import { generateAttachmentKey, openChunk, sealChunk } from '../wasm'
import { requireActiveClient } from '../ws/activeClient'
import { ENVELOPE_TYPE_ATTACHMENT_KEY } from '../ws/envelopeTypes'
import { buildEnvelope, encryptForDevice, resolvePeerDevices } from './envelopes'
import { persistSnapshot } from './snapshot'

/**
 * Attachment transfer.
 *
 * The chunks are sealed by the WASM module before they leave the device, so S3
 * only ever stores ciphertext; the symmetric key travels separately, encrypted
 * for each of the recipient's devices.
 */

/** A sealed chunk carries a 16-byte Poly1305 tag, which does not fit the budget. */
const SEALED_OVERHEAD_BYTES = 16

export type UploadedAttachment = {
  attachment: AttachmentRecord
  keyHex: string
  baseNonceHex: string
}

/**
 * Seals and uploads a file, returning the stored record.
 *
 * The record is written here rather than by the caller because the key it holds
 * is what makes the upload useful at all.
 */
export async function uploadAttachment(
  account: Account,
  conversationId: string,
  bytes: Uint8Array,
  kind: AttachmentKind = 'attachment',
): Promise<UploadedAttachment> {
  const key = await generateAttachmentKey()
  const plan = await recommendChunkSize(account, bytes.length)

  // The recommended chunk size is a ceiling for the *sealed* chunk, so the
  // plaintext slice has to be that much smaller.
  const plaintextChunkSize = Math.max(1, plan.chunkSize - SEALED_OVERHEAD_BYTES)
  const chunkCount = Math.max(1, Math.ceil(bytes.length / plaintextChunkSize))

  const sealedChunks: Uint8Array[] = []
  for (let index = 0; index < chunkCount; index += 1) {
    const start = index * plaintextChunkSize
    const plaintext = bytes.subarray(start, Math.min(start + plaintextChunkSize, bytes.length))
    sealedChunks.push(await sealChunk(key.keyHex, key.baseNonceHex, index, plaintext))
  }

  const initialised = await initAttachment(account, {
    chunkSizes: sealedChunks.map((chunk) => chunk.length),
    conversationId,
    kind,
  })

  for (const upload of initialised.uploads) {
    const chunk = sealedChunks[upload.chunkIndex]
    if (chunk === undefined) {
      throw new Error(
        `[crypto] the server asked for chunk ${upload.chunkIndex} of an upload that has ${sealedChunks.length}`,
      )
    }
    await putAttachmentChunk(upload.url, chunk)
  }

  await finalizeAttachment(account, initialised.attachmentId)

  const attachment: AttachmentRecord = {
    id: initialised.attachmentId,
    accountId: account.id,
    conversationId,
    totalSize: bytes.length,
    chunkCount: initialised.chunkCount,
    kind,
    keyHex: key.keyHex,
    baseNonceHex: key.baseNonceHex,
    localPath: null,
  }
  await saveAttachment(attachment)

  return { attachment, keyHex: key.keyHex, baseNonceHex: key.baseNonceHex }
}

/**
 * Downloads and opens a file.
 *
 * Returns a `Blob` because that is what the UI hands to an object URL or a
 * download; callers that need bytes can `await blob.arrayBuffer()`.
 */
export async function downloadAttachment(
  account: Account,
  attachment: AttachmentRecord,
): Promise<Blob> {
  if (attachment.keyHex === null || attachment.baseNonceHex === null) {
    throw new Error(
      `[crypto] attachment ${attachment.id} has no key yet: the key envelope has not arrived`,
    )
  }

  // Claiming keeps the blob alive; it is not what grants access. A failure here
  // (already claimed, or an attachment this device uploaded itself) must not
  // stop the download, which will report a real access problem on its own.
  try {
    await claimAttachment(account, attachment.id)
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
      console.warn(`[crypto] claim for ${attachment.id} was not needed`, error.code)
    } else {
      throw error
    }
  }

  const download = await getAttachmentChunks(account, attachment.id)
  const ordered = [...download.chunks].sort((left, right) => left.chunkIndex - right.chunkIndex)

  const parts: BlobPart[] = []
  for (const chunk of ordered) {
    const sealed = await fetchAttachmentChunk(chunk.url)
    const plaintext = await openChunk(
      attachment.keyHex,
      attachment.baseNonceHex,
      chunk.chunkIndex,
      sealed,
    )
    parts.push(asBinaryPayload(plaintext))
  }

  return new Blob(parts)
}

/** Hands the attachment's key to every device of a recipient. */
export async function sendAttachmentKey(
  account: Account,
  recipientAccountId: string,
  attachment: AttachmentRecord,
  conversationId: string | null,
): Promise<number> {
  if (attachment.keyHex === null || attachment.baseNonceHex === null) {
    throw new Error(`[crypto] attachment ${attachment.id} has no key to send`)
  }

  const payload = {
    kind: 'attachment_key',
    attachment_id: attachment.id,
    key_hex: attachment.keyHex,
    base_nonce_hex: attachment.baseNonceHex,
    conversation_id: conversationId,
  }
  const payloadHex = utf8ToHex(JSON.stringify(payload))

  const devices = await resolvePeerDevices(account, recipientAccountId)
  const envelopes = []

  for (const device of devices) {
    const encrypted = await encryptForDevice(
      account,
      recipientAccountId,
      device.deviceNumber,
      payloadHex,
    )
    envelopes.push(
      buildEnvelope({
        senderAccountId: account.id,
        senderDeviceNumber: account.deviceNumber,
        recipientAccountId,
        recipientDeviceNumber: device.deviceNumber,
        envelopeType: ENVELOPE_TYPE_ATTACHMENT_KEY,
        isPrekeyMessage: encrypted.isPrekeyMessage,
        ciphertextHex: encrypted.ciphertextHex,
        conversationId,
      }),
    )
  }

  if (envelopes.length > 0) {
    await requireActiveClient().uploadEnvelopes(envelopes)
    await persistSnapshot(account.id)
  }

  return envelopes.length
}
