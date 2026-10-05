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

/** A group's picture. Same WebP rule and the same 5 MiB ceiling as an account's. */
export function uploadGroupAvatar(
  account: AccountAuth,
  groupId: string,
  webpBytes: Uint8Array,
): Promise<AvatarUploadResult> {
  return post<AvatarUploadResult>(`/groups/${encodeURIComponent(groupId)}/avatar`, undefined, {
    account,
    rawBody: webpBytes,
    headers: { 'Content-Type': 'image/webp' },
  })
}

export function deleteGroupAvatar(account: AccountAuth, groupId: string): Promise<void> {
  return del<void>(`/groups/${encodeURIComponent(groupId)}/avatar`, undefined, { account })
}

/** A channel's picture. */
export function uploadChannelAvatar(
  account: AccountAuth,
  channelId: string,
  webpBytes: Uint8Array,
): Promise<AvatarUploadResult> {
  return post<AvatarUploadResult>(`/channels/${encodeURIComponent(channelId)}/avatar`, undefined, {
    account,
    rawBody: webpBytes,
    headers: { 'Content-Type': 'image/webp' },
  })
}

export function deleteChannelAvatar(account: AccountAuth, channelId: string): Promise<void> {
  return del<void>(`/channels/${encodeURIComponent(channelId)}/avatar`, undefined, { account })
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

/**
 * Public URL for a conversation's picture — group or channel, no authentication.
 *
 * Built like an account's and versioned the same way: the browser caches the 404
 * of a group with no picture, so replacing one has to change the URL.
 */
export function conversationAvatarUrl(conversationId: string): string {
  const base = `${API_BASE_URL.replace(/\/+$/, '')}/conversations/${encodeURIComponent(conversationId)}/avatar`
  const version = versions.get(conversationId)
  return version === undefined ? base : `${base}?v=${version}`
}

/** See `invalidateAvatar`; conversations are cached under their own id. */
export function invalidateConversationAvatar(conversationId: string): void {
  versions.set(conversationId, Date.now())
}
