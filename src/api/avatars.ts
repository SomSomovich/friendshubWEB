import { API_BASE_URL } from './client'
import type { AccountAuth } from './auth'
import { del, post } from './client'

export type AvatarUploadResult = {
  avatarUrl: string
}

/** Proxied upload: the server validates the WebP magic bytes and size (5 MiB). */
export function uploadAvatar(
  account: AccountAuth,
  webpBytes: Uint8Array,
): Promise<AvatarUploadResult> {
  return post<AvatarUploadResult>('/avatars/me', undefined, {
    account,
    rawBody: webpBytes,
    headers: { 'Content-Type': 'image/webp' },
  })
}

export function deleteAvatar(account: AccountAuth): Promise<void> {
  return del<void>('/avatars/me', undefined, { account })
}

/**
 * Public URL for an avatar image — usable straight in `<img src>`.
 *
 * The endpoint needs no authentication, which is why this is a plain string
 * builder rather than a request: the browser fetches it as an image, and the 404
 * for an account without an avatar is handled by the image's own error path.
 */
export function avatarImageUrl(accountId: string): string {
  return `${API_BASE_URL.replace(/\/+$/, '')}/avatars/${encodeURIComponent(accountId)}`
}
