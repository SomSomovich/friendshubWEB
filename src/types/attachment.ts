export type AttachmentKind = 'attachment' | 'thumbnail'

/**
 * One uploaded file. `keyHex`/`baseNonceHex` stay `null` until the matching
 * `ENVELOPE_TYPE_ATTACHMENT_KEY` envelope arrives — without them the chunks
 * cannot be opened, which is why they are stored next to the metadata.
 */
export type Attachment = {
  id: string
  conversationId: string
  totalSize: number
  chunkCount: number
  kind: AttachmentKind
  keyHex: string | null
  baseNonceHex: string | null
  /** Local only: cached copy of a downloaded/received file. */
  localPath: string | null
}
