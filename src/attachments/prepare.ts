import { fileToWebp, MESSAGE_IMAGE } from '../utils/image'

/**
 * One file waiting to be sent, with what the sender decided about it.
 *
 * The distance between the two sizes is the whole argument for the compression
 * checkbox, so both are measured before anything is uploaded.
 */
export type PendingAttachment = {
  id: string
  blob: Blob
  name: string
  /** Re-encode to WebP on the way out. Images only; a no-op for anything else. */
  compress: boolean
  previewUrl: string | null
  /** What the file would weigh if it were converted, or `null` if it cannot be. */
  compressedSize: number | null
}

/**
 * Prepares a picked file for the overlay.
 *
 * The conversion is done here, before anything is sent, for two reasons: the
 * checkbox needs a number to offer the user, and a picture this browser cannot
 * decode should be discovered now rather than half-way through an upload.
 */
export async function preparePending(file: File, compress: boolean): Promise<PendingAttachment> {
  const id = crypto.randomUUID()
  const isImage = file.type.startsWith('image/')

  let compressedSize: number | null = null
  if (isImage) {
    try {
      compressedSize = (await fileToWebp(file, MESSAGE_IMAGE)).length
    } catch (error) {
      // Not a picture this browser can read; it will be sent as it is.
      console.warn('[attachments] the image could not be measured for compression', error)
    }
  }

  return {
    id,
    blob: file,
    name: file.name,
    compress: isImage && compressedSize !== null ? compress : false,
    // Only for what a browser can render in an <img>; a video is shown by its
    // own element and a document by its icon.
    previewUrl: isImage ? URL.createObjectURL(file) : null,
    compressedSize,
  }
}

/** Frees the preview of a file that is no longer queued. */
export function releasePending(attachment: PendingAttachment): void {
  if (attachment.previewUrl !== null) {
    URL.revokeObjectURL(attachment.previewUrl)
  }
}
