/** The small set of attachment families the chat list needs to name. */
export type AttachmentPreviewKind = 'photo' | 'video' | 'voice' | 'file'

/**
 * Uses the stored content type when available and falls back to the sender's
 * filename for records created before content types were persisted.
 */
export function attachmentPreviewKind(contentType: string | null | undefined, fileName: string | null | undefined): AttachmentPreviewKind {
  const type = contentType?.toLowerCase() ?? ''
  if (type.startsWith('image/')) return 'photo'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'voice'

  const extension = fileName?.toLowerCase().split('.').pop() ?? ''
  if (['avif', 'gif', 'jpeg', 'jpg', 'png', 'webp'].includes(extension)) return 'photo'
  if (['avi', 'mkv', 'mov', 'mp4', 'webm'].includes(extension)) return 'video'
  if (['aac', 'flac', 'm4a', 'mp3', 'oga', 'ogg', 'opus', 'wav', 'weba'].includes(extension)) return 'voice'
  return 'file'
}
