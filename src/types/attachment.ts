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
  /**
   * The name the sender gave it.
   *
   * Known only to the device that picked the file: the payload carries bare ids,
   * so this is empty for everything received. See `displayName` for what a
   * receiver shows instead.
   */
  fileName?: string | null
  /**
   * What the bytes are, when this device knows.
   *
   * Known for a file this device uploaded — it picked it. For a received one it
   * is worked out from the magic bytes after the first download, and stored so
   * the second visit does not have to download the file to find out again; the
   * protocol carries no content type of its own.
   */
  contentType?: string | null
  /** Local only: cached copy of a downloaded/received file. */
  localPath: string | null
}
