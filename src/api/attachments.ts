import type { AccountAuth } from './auth'
import { get, post, request } from './client'

/**
 * Attachment transfer is a four-step dance with S3 in the middle: recommend a
 * chunk size, initialise the upload, PUT every chunk to its presigned URL, then
 * finalise. Chunk bytes are sealed by the WASM module before they get here.
 */

export type ChunkPlan = {
  chunkSize: number
  chunkCount: number
  chunkSizes: number[]
}

export type AttachmentUpload = {
  chunkIndex: number
  /** Presigned PUT URL; valid for 15 minutes. */
  url: string
}

export type InitialisedAttachment = {
  attachmentId: string
  chunkCount: number
  totalSize: number
  uploads: AttachmentUpload[]
}

export type AttachmentChunk = {
  chunkIndex: number
  sizeBytes: number
  /** Presigned GET URL; valid for 15 minutes. */
  url: string
}

export type AttachmentDownload = {
  attachmentId: string
  totalSize: number
  chunkCount: number
  chunks: AttachmentChunk[]
}

export type AttachmentKind = 'attachment' | 'thumbnail'

export function recommendChunkSize(account: AccountAuth, totalSize: number): Promise<ChunkPlan> {
  return post<ChunkPlan>('/attachments/recommend', { total_size: totalSize }, { account })
}

export function initAttachment(
  account: AccountAuth,
  input: { chunkSizes: number[]; conversationId: string; kind: AttachmentKind },
): Promise<InitialisedAttachment> {
  return post<InitialisedAttachment>(
    '/attachments/init',
    {
      chunk_sizes: input.chunkSizes,
      conversation_id: input.conversationId,
      kind: input.kind,
    },
    { account },
  )
}

/** The server verifies every chunk exists and has the declared size. */
export function finalizeAttachment(account: AccountAuth, attachmentId: string): Promise<void> {
  return post<void>(`/attachments/${encodeURIComponent(attachmentId)}/finalize`, undefined, {
    account,
  })
}

/** A recipient (or forwarder) takes a claim so the blob is not garbage collected. */
export function claimAttachment(account: AccountAuth, attachmentId: string): Promise<void> {
  return post<void>(`/attachments/${encodeURIComponent(attachmentId)}/claim`, undefined, {
    account,
  })
}

/** Drops this account's claim; the last one out deletes the blob. */
export function releaseAttachment(account: AccountAuth, attachmentId: string): Promise<void> {
  return post<void>(`/attachments/${encodeURIComponent(attachmentId)}/release`, undefined, {
    account,
  })
}

export function getAttachmentChunks(
  account: AccountAuth,
  attachmentId: string,
): Promise<AttachmentDownload> {
  return get<AttachmentDownload>(`/attachments/${encodeURIComponent(attachmentId)}`, { account })
}

/**
 * Uploads one sealed chunk straight to S3.
 *
 * No `Authorization` header and no API base URL: the URL is already presigned,
 * and the extra header would make the signature fail. `request` handles this
 * because an absolute path bypasses the base URL and a missing token means no
 * auth header is attached.
 */
export function putAttachmentChunk(uploadUrl: string, sealed: Uint8Array): Promise<void> {
  return request<void>('PUT', uploadUrl, undefined, { rawBody: sealed })
}

/** Downloads one sealed chunk; the bytes are returned as-is for `open_chunk`. */
export function fetchAttachmentChunk(downloadUrl: string): Promise<Uint8Array> {
  return request<Uint8Array>('GET', downloadUrl, undefined, { responseType: 'bytes' })
}
