import { openDatabase, type AttachmentRecord } from './db'

/**
 * Attachment metadata and the symmetric key that opens it.
 *
 * The key arrives in its own `ENVELOPE_TYPE_ATTACHMENT_KEY` envelope, which can
 * land before, after or without the message that references the attachment, so
 * it is stored on the attachment record instead of on the message.
 */

export async function saveAttachment(record: AttachmentRecord): Promise<void> {
  const database = await openDatabase()
  await database.put('attachments', record)
}

export async function getAttachment(
  accountId: string,
  attachmentId: string,
): Promise<AttachmentRecord | null> {
  const database = await openDatabase()
  const record = await database.get('attachments', [accountId, attachmentId])
  return record ?? null
}

/**
 * Stores the key from a received key envelope.
 *
 * A key can arrive before the message that references the attachment — the
 * protocol sends them as independent envelopes — so a missing row is created as
 * a placeholder instead of dropping the key. The real sizes are not needed: the
 * download path reads them from `GET /attachments/{id}`, so the placeholders
 * only have to be honest about being unknown.
 */
export async function setAttachmentKey(
  accountId: string,
  attachmentId: string,
  keyHex: string,
  baseNonceHex: string,
  conversationId: string | null,
): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction('attachments', 'readwrite')
  const existing = await transaction.store.get([accountId, attachmentId])

  const record: AttachmentRecord = existing ?? {
    id: attachmentId,
    accountId,
    conversationId: conversationId ?? '',
    totalSize: 0,
    chunkCount: 0,
    kind: 'attachment',
    keyHex: null,
    baseNonceHex: null,
    contentType: null,
    fileName: null,
    localPath: null,
  }

  await transaction.store.put({ ...record, keyHex, baseNonceHex })
  await transaction.done
}
