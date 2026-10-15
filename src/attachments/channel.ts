import { fetchAttachmentChunk, finalizeAttachment, getAttachmentChunks, initAttachment, putAttachmentChunk, recommendChunkSize, releaseAttachment } from '../api/attachments'
import type { AccountAuth } from '../api/auth'

/** Channels are server-readable broadcasts. Upload the original bytes, without E2E keys. */
export async function uploadChannelAttachment(account: AccountAuth, channelId: string, file: Blob,
  onProgress: (fraction: number) => void = () => {}): Promise<string> {
  const plan = await recommendChunkSize(account, file.size)
  const sizes = plan.chunkSizes
  if (sizes.length === 0 || sizes.length > 500 || sizes.some((size) => !Number.isSafeInteger(size) || size < 0 || size > 32 * 1024 * 1024) || sizes.reduce((sum, size) => sum + size, 0) !== file.size) {
    throw new Error('Invalid attachment chunk plan')
  }
  const uploaded = await initAttachment(account, { conversationId: channelId, kind: 'attachment', chunkSizes: sizes })
  try {
    const uploads = [...uploaded.uploads].sort((a, b) => a.chunkIndex - b.chunkIndex)
    if (uploaded.totalSize !== file.size || uploaded.chunkCount !== sizes.length || uploads.length !== sizes.length || uploads.some((chunk, index) => chunk.chunkIndex !== index)) throw new Error('Incomplete attachment upload plan')
    let offset = 0
    for (const [index, upload] of uploads.entries()) {
      const bytes = new Uint8Array(await file.slice(offset, offset + sizes[index]!).arrayBuffer())
      await putAttachmentChunk(upload.url, bytes)
      offset += sizes[index]!
      onProgress((index + 1) / sizes.length)
    }
    await finalizeAttachment(account, uploaded.attachmentId)
    return uploaded.attachmentId
  } catch (cause) {
    await releaseAttachment(account, uploaded.attachmentId).catch(() => {})
    throw cause
  }
}

export async function downloadChannelAttachment(account: AccountAuth, attachmentId: string): Promise<Uint8Array<ArrayBuffer>> {
  const meta = await getAttachmentChunks(account, attachmentId)
  const chunks = [...meta.chunks].sort((a, b) => a.chunkIndex - b.chunkIndex)
  if (!Number.isSafeInteger(meta.totalSize) || meta.totalSize < 0 || chunks.length !== meta.chunkCount || chunks.length > 500 || chunks.some((chunk, index) => chunk.chunkIndex !== index || !Number.isSafeInteger(chunk.sizeBytes) || chunk.sizeBytes < 0) || chunks.reduce((size, chunk) => size + chunk.sizeBytes, 0) !== meta.totalSize) throw new Error('Incomplete attachment download plan')
  const bytes = new Uint8Array(meta.totalSize)
  let offset = 0
  for (const chunk of chunks) {
    const data = await fetchAttachmentChunk(chunk.url)
    if (data.length !== chunk.sizeBytes) throw new Error('Attachment chunk size mismatch')
    bytes.set(data, offset)
    offset += data.length
  }
  return bytes
}
