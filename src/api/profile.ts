import type { AccountAuth } from './auth'
import { del, get, post, put } from './client'

export type PublicProfile = {
  id: string
  userId: number
  fhNumber: string
  username: string
  avatarUrl: string | null
  customStatusText: string | null
  customStatusEmoji: string | null
  customStatusExpiresAt: number | null
  isBlockedByMe: boolean
  isContact: boolean
}

export type PresenceResponse = {
  accountId: string
  isOnline: boolean
  lastSeen: number | null
  customStatusText: string | null
  customStatusEmoji: string | null
  customStatusExpiresAt: number | null
  /** `false` when the target's invisibility mode hides them from this viewer. */
  visible: boolean
}

export type PresenceExceptionKind = 'always_visible' | 'always_invisible'

export type PresenceException = {
  targetAccountId: string
  kind: PresenceExceptionKind
  createdAt: number
}

export type StatusInput = {
  text: string | null
  emoji: string | null
  /** `null` means the status never expires; `0` and negatives are rejected. */
  ttlSeconds: number | null
}

export function setUsername(account: AccountAuth, username: string): Promise<void> {
  return put<void>('/profile/username', { username }, { account })
}

export function setStatus(account: AccountAuth, input: StatusInput): Promise<void> {
  return put<void>(
    '/profile/status',
    { text: input.text, emoji: input.emoji, ttl_seconds: input.ttlSeconds },
    { account },
  )
}

export function clearStatus(account: AccountAuth): Promise<void> {
  return del<void>('/profile/status', undefined, { account })
}

export function setInvisible(account: AccountAuth, enabled: boolean): Promise<void> {
  return put<void>('/profile/invisible', { enabled }, { account })
}

export function listPresenceExceptions(account: AccountAuth): Promise<PresenceException[]> {
  return get<PresenceException[]>('/profile/presence-exceptions', { account })
}

export function addPresenceException(
  account: AccountAuth,
  input: { targetAccountId: string; kind: PresenceExceptionKind },
): Promise<void> {
  return post<void>(
    '/profile/presence-exceptions',
    { target_account_id: input.targetAccountId, kind: input.kind },
    { account },
  )
}

/** Removal is a POST with a body, not a DELETE, per the API. */
export function removePresenceException(
  account: AccountAuth,
  input: { targetAccountId: string; kind: PresenceExceptionKind },
): Promise<void> {
  return post<void>(
    '/profile/presence-exceptions/remove',
    { target_account_id: input.targetAccountId, kind: input.kind },
    { account },
  )
}

export function getAccountProfile(
  account: AccountAuth,
  targetAccountId: string,
): Promise<PublicProfile> {
  return get<PublicProfile>(`/accounts/${encodeURIComponent(targetAccountId)}/profile`, { account })
}

/** One-off presence read; live updates arrive over the WebSocket instead. */
export function getAccountPresence(
  account: AccountAuth,
  targetAccountId: string,
): Promise<PresenceResponse> {
  return get<PresenceResponse>(`/accounts/${encodeURIComponent(targetAccountId)}/presence`, {
    account,
  })
}
