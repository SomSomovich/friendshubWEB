import { downloadAttachment } from '../crypto/attachments'
import { saveAttachment } from '../storage/attachments'
import type { AttachmentRecord } from '../storage/db'
import type { Account } from '../types'
import { detectMime, type AttachmentMime } from './mime'

/**
 * Fetching an attachment's bytes and turning them into something a page can show.
 *
 * The object URL is cached per attachment id, because the alternative is
 * downloading and unsealing a whole photo again every time the transcript
 * re-renders. The cache is bounded and revokes what it drops: an object URL pins
 * its blob in memory for the life of the document.
 */

/** Enough for a screenful of thumbnails, and small enough not to hold a video each. */
const MAX_CACHED = 24

type Cached = { url: string; mime: AttachmentMime }

const cache = new Map<string, Cached>()
/** In-flight downloads, so two components asking at once share one transfer. */
const pending = new Map<string, Promise<Cached>>()

export type LoadedAttachment = Cached

export async function loadAttachment(
  account: Account,
  attachment: AttachmentRecord,
): Promise<LoadedAttachment> {
  const cached = cache.get(attachment.id)
  if (cached !== undefined) {
    return cached
  }

  const inFlight = pending.get(attachment.id)
  if (inFlight !== undefined) {
    return inFlight
  }

  const transfer = transferAttachment(account, attachment).finally(() => {
    pending.delete(attachment.id)
  })
  pending.set(attachment.id, transfer)
  return transfer
}

/** Frees one attachment's memory; called when a viewer closes over a large file. */
export function releaseAttachment(attachmentId: string): void {
  const cached = cache.get(attachmentId)
  if (cached === undefined) {
    return
  }
  URL.revokeObjectURL(cached.url)
  cache.delete(attachmentId)
}

async function transferAttachment(
  account: Account,
  attachment: AttachmentRecord,
): Promise<LoadedAttachment> {
  const blob = await downloadAttachment(account, attachment)
  const bytes = new Uint8Array(await blob.arrayBuffer())

  // The protocol carries no content type, so the bytes say what they are. The
  // first four bytes are enough and cost nothing on a 20 MB video.
  const mime = detectMime(bytes.subarray(0, 64))
  const typed = new Blob([blob], { type: mime.type })
  const loaded: Cached = { url: URL.createObjectURL(typed), mime }

  await rememberContentType(attachment, mime.type)
  remember(attachment.id, loaded)
  return loaded
}

/**
 * Stores what the bytes turned out to be.
 *
 * Not decoration: without it, every visit to the conversation would download the
 * file again before it could decide how to draw it.
 */
async function rememberContentType(
  attachment: AttachmentRecord,
  contentType: string,
): Promise<void> {
  if (attachment.contentType === contentType) {
    return
  }
  try {
    await saveAttachment({ ...attachment, contentType })
  } catch (error) {
    // A record that cannot be updated costs a repeated sniff, not the file.
    console.warn('[attachments] the content type could not be stored', error)
  }
}

function remember(attachmentId: string, loaded: Cached): void {
  cache.set(attachmentId, loaded)

  while (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next()
    if (oldest.done === true) {
      break
    }
    releaseAttachment(oldest.value)
  }
}
