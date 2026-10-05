import type { AttachmentMime } from './mime'

/**
 * How an attachment is described on screen.
 *
 * The awkward one is the name. The message payload carries bare ids, so a file's
 * name is known only to the device that picked it; a receiver has the bytes and
 * nothing else. The bytes do give the type, so the fallback is a stable invented
 * name with the right extension — honest about not knowing, and useful anyway,
 * because it is what a download will be saved as.
 */

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} Б`
  }
  const units = ['КиБ', 'МиБ', 'ГиБ']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex] ?? 'КиБ'}`
}

export function displayName(
  fileName: string | null,
  attachmentId: string,
  mime: AttachmentMime,
): string {
  if (fileName !== null && fileName.length > 0) {
    return fileName
  }
  return `file-${attachmentId.slice(0, 8)}${extensionOf(mime.type)}`
}

function extensionOf(contentType: string): string {
  const known: Record<string, string> = {
    'image/webp': '.webp',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'application/pdf': '.pdf',
  }
  return known[contentType] ?? ''
}
