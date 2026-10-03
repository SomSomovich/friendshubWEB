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
 * Attaches the key from a received key envelope. Does nothing when the
 * attachment is unknown — the message may not have arrived yet, and a key
 * without metadata has nowhere to live.
 */
export async function setAttachmentKey(
  accountId: string,
  attachmentId: string,
  keyHex: string,
  baseNonceHex: string,
): Promise<boolean> {
  const database = await openDatabase()
  const transaction = database.transaction('attachments', 'readwrite')
  const record = await transaction.store.get([accountId, attachmentId])

  if (!record) {
    await transaction.done
    return false
  }

  await transaction.store.put({ ...record, keyHex, baseNonceHex })
  await transaction.done
  return true
}
