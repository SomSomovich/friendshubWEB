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

/**
 * Accounts whose avatar changed in this tab, and when.
 *
 * The URL is the only thing an `<img>` understands, so replacing an image means
 * changing the URL. Without the query a freshly uploaded avatar would keep
 * showing the cached 404 of the account that had none.
 */
const versions = new Map<string, number>()

export function avatarImageUrl(accountId: string): string {
  const base = `${API_BASE_URL.replace(/\/+$/, '')}/avatars/${encodeURIComponent(accountId)}`
  const version = versions.get(accountId)
  return version === undefined ? base : `${base}?v=${version}`
}

/** Records that an account's avatar changed; callers then re-render to pick it up. */
export function invalidateAvatar(accountId: string): void {
  versions.set(accountId, Date.now())
}
