import type { AccountAuth } from './auth'
import { del, get, post, put } from './client'

export type ProfileField = { label: string; value: string }

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
  profileFields: ProfileField[]
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

export type ProfilePrivacy = {
  hideProfile: boolean
  hideFromSearch: boolean
}

export type ProfileException = {
  accountId: string
  createdAt: number
}

export function getProfilePrivacy(account: AccountAuth): Promise<ProfilePrivacy> {
  return get('/profile/privacy', { account })
}

export function setProfileHidden(account: AccountAuth, enabled: boolean): Promise<void> {
  return put('/profile/privacy/hide-profile', { enabled }, { account })
}

export function setProfileHiddenFromSearch(account: AccountAuth, enabled: boolean): Promise<void> {
  return put('/profile/privacy/hide-from-search', { enabled }, { account })
}

export function listProfileExceptions(account: AccountAuth): Promise<ProfileException[]> {
  return get('/profile/privacy/profile-exceptions', { account })
}

export function addProfileException(account: AccountAuth, targetAccountId: string): Promise<void> {
  return post('/profile/privacy/profile-exceptions', { account_id: targetAccountId }, { account })
}

export function removeProfileException(account: AccountAuth, targetAccountId: string): Promise<void> {
  return del(`/profile/privacy/profile-exceptions/${encodeURIComponent(targetAccountId)}`, undefined, { account })
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

/** Whether other accounts may send this account transient nudge frames. */
export function getAllowNudges(account: AccountAuth): Promise<{ allow: boolean }> {
  return get<{ allow: boolean }>('/profile/allow-nudges', { account })
}

export function setAllowNudges(account: AccountAuth, allow: boolean): Promise<void> {
  return put<void>('/profile/allow-nudges', { allow }, { account })
}

/**
 * The stored invisibility flag.
 *
 * New in the updated API; before it, the client kept a local mirror of what it
 * had last set, because there was no way to ask.
 */
export function getInvisible(account: AccountAuth): Promise<{ enabled: boolean }> {
  return get<{ enabled: boolean }>('/profile/invisible', { account })
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
  return get<PublicProfile & { fields?: ProfileField[] }>(`/accounts/${encodeURIComponent(targetAccountId)}/profile`, { account })
    .then((profile) => ({
      ...profile,
      // Older API deployments called this collection `fields`; accepting that
      // spelling keeps the public profile readable while the server rolls out
      // the documented `profile_fields` response everywhere.
      profileFields: profile.profileFields ?? profile.fields ?? [],
    }))
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

export function getProfileFields(account: AccountAuth): Promise<{ fields: ProfileField[] }> {
  return get('/profile/fields', { account })
}

/** Replaces the entire set, including deletion with an empty list. */
export function setProfileFields(account: AccountAuth, fields: ProfileField[]): Promise<void> {
  return put('/profile/fields', { fields }, { account })
}

export type DmPolicy = 'everyone' | 'contacts_only'
export type GroupAddPolicy = 'everyone' | 'nobody'
export type GroupAddException = { accountId: string; createdAt: number }

export function getDmPolicy(account: AccountAuth): Promise<{ policy: DmPolicy }> {
  return get('/profile/dm-policy', { account })
}

export function setDmPolicy(account: AccountAuth, policy: DmPolicy): Promise<void> {
  return put('/profile/dm-policy', { policy }, { account })
}

export function getGroupAddPolicy(account: AccountAuth): Promise<{ policy: GroupAddPolicy }> {
  return get('/profile/group-add-policy', { account })
}

export function setGroupAddPolicy(account: AccountAuth, policy: GroupAddPolicy): Promise<void> {
  return put('/profile/group-add-policy', { policy }, { account })
}

export function listGroupAddExceptions(account: AccountAuth): Promise<GroupAddException[]> {
  return get('/profile/group-add-exceptions', { account })
}

export function addGroupAddException(account: AccountAuth, accountId: string): Promise<void> {
  return post('/profile/group-add-exceptions', { account_id: accountId }, { account })
}

export function removeGroupAddException(account: AccountAuth, accountId: string): Promise<void> {
  return del(`/profile/group-add-exceptions/${encodeURIComponent(accountId)}`, undefined, { account })
}
