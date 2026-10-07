import { getConversation } from '../api/conversations'
import { uploadAttachment } from '../crypto/attachments'
import { ownDeviceCopies } from '../crypto/send'
import { encodePayload, type AttachmentKeyPayload } from '../crypto/payloads'
import { persistSnapshot } from '../crypto/snapshot'
import { ENVELOPE_TYPE_ATTACHMENT_KEY } from '../ws/envelopeTypes'
import { requireActiveClient } from '../ws/activeClient'
import { pairwiseFanout, resolvePeerDevices } from '../crypto/envelopes'
import { fileToWebp, MESSAGE_IMAGE } from '../utils/image'
import type { Account, Envelope } from '../types'

/**
 * Sending files.
 *
 * Each file is sealed chunk by chunk and handed to S3, and the key that opens it
 * travels separately — one `ENVELOPE_TYPE_ATTACHMENT_KEY` per recipient device,
 * sent *before* the message that names the attachment. A message that arrives
 * before its key would render as a file nobody can open, and the delay is a
 * round trip on a path that already made several.
 */

export type OutgoingAttachment = {
  /** A picked file, or the blob a voice note produced. */
  blob: Blob
  name: string
  /**
   * Re-encode to WebP before uploading. Images only, and the user's choice:
   * a screenshot of text suffers from it and a photo does not.
   */
  compress: boolean
}

export type UploadProgress = {
  /** Zero-based, so the UI can say "2 of 3". */
  fileIndex: number
  fileCount: number
  /** 0..1 for the file in flight, counting preparation as its first tenth. */
  fraction: number
}

export type SendAttachmentsInput = {
  account: Account
  conversationId: string
  files: OutgoingAttachment[]
  /** The message that names them; may be empty for a voice note. */
  caption: string
  onProgress: (progress: UploadProgress) => void
}

/** @returns the ids to put in the message payload's `attachment_ids`. */
export async function uploadAll(input: SendAttachmentsInput): Promise<string[]> {
  const { account, conversationId, files, onProgress } = input
  const attachmentIds: string[] = []

  const recipients = await resolveRecipients(account, conversationId)

  for (const [fileIndex, file] of files.entries()) {
    const report = (fraction: number): void => {
      onProgress({ fileIndex, fileCount: files.length, fraction })
    }

    report(0.05)
    const bytes = await prepareBytes(file)
    report(0.1)

    const uploaded = await uploadAttachment(
      account,
      conversationId,
      bytes,
      'attachment',
      contentTypeOf(file),
      file.name,
      (done, total) => {
        // Preparation took the first tenth; the chunks are the rest.
        report(0.1 + 0.9 * (total === 0 ? 1 : done / total))
      },
    )
    report(1)

    attachmentIds.push(uploaded.attachment.id)
    await broadcastKey(account, conversationId, recipients, uploaded.attachment)
  }

  return attachmentIds
}

/** A file's bytes as they will be uploaded, after any conversion. */
async function prepareBytes(file: OutgoingAttachment): Promise<Uint8Array> {
  const isImage = file.blob.type.startsWith('image/')
  if (!file.compress || !isImage) {
    return new Uint8Array(await file.blob.arrayBuffer())
  }

  try {
    // `fileToWebp` wants a File for its name, but only ever reads the bytes.
    return await fileToWebp(new File([file.blob], file.name), MESSAGE_IMAGE)
  } catch (error) {
    // A picture this browser cannot decode is still a file worth sending.
    console.warn('[attachments] the image could not be converted; sending it as it is', error)
    return new Uint8Array(await file.blob.arrayBuffer())
  }
}

/**
 * The type recorded against the upload.
 *
 * Converted images are WebP whatever they started as, and a voice note is
 * whatever the recorder produced. It is local knowledge only — the protocol
 * carries no content type, which is why a receiver sniffs the bytes instead.
 */
function contentTypeOf(file: OutgoingAttachment): string | null {
  if (file.compress && file.blob.type.startsWith('image/')) {
    return 'image/webp'
  }
  return file.blob.type.length > 0 ? file.blob.type : null
}

/** Everyone who has to be able to open these files: the members, and our own devices. */
async function resolveRecipients(account: Account, conversationId: string): Promise<string[]> {
  const detail = await getConversation(account, conversationId)
  return detail.members.filter((member) => member !== account.id)
}

/**
 * Hands one attachment's key to every device that will need it.
 *
 * Separate from the message on purpose: the key is not something a message
 * carries, and a device that missed the key can still be given it again.
 */
async function broadcastKey(
  account: Account,
  conversationId: string,
  recipients: string[],
  attachment: { id: string; keyHex: string | null; baseNonceHex: string | null },
): Promise<void> {
  if (attachment.keyHex === null || attachment.baseNonceHex === null) {
    throw new Error(`[attachments] ${attachment.id} has no key to send`)
  }

  const payload: AttachmentKeyPayload = {
    kind: 'attachment_key',
    attachment_id: attachment.id,
    key_hex: attachment.keyHex,
    base_nonce_hex: attachment.baseNonceHex,
    conversation_id: conversationId,
  }
  const payloadHex = encodePayload(payload)

  const envelopes: Envelope[] = []
  /** Envelopes for the *recipients*, which is what decides whether this failed. */
  let deliveredToOthers = 0
  let cause: unknown = null

  for (const recipient of recipients) {
    const fanout = await pairwiseFanout(
      account,
      recipient,
      await resolvePeerDevices(account, recipient),
      payloadHex,
      ENVELOPE_TYPE_ATTACHMENT_KEY,
      conversationId,
    )
    envelopes.push(...fanout.envelopes)
    deliveredToOthers += fanout.envelopes.length
    cause ??= fanout.cause
  }

  envelopes.push(
    ...(await ownDeviceCopies(account, payloadHex, ENVELOPE_TYPE_ATTACHMENT_KEY, conversationId)),
  )

  // A key that reached no recipient leaves the file unopenable on the other
  // side, so that fails rather than being sent — and it fails with the server's
  // own reason. Our own copies do not count: they do not make the file readable
  // to anybody else.
  if (deliveredToOthers === 0 && cause !== null) {
    throw cause
  }

  if (envelopes.length > 0) {
    await requireActiveClient().uploadEnvelopes(envelopes)
    await persistSnapshot(account.id)
  }
}
