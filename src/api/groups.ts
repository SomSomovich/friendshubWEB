import type { AccountAuth } from './auth'
import { del, get, post } from './client'

export type GroupCreated = {
  conversationId: string
  title: string
  isPublic: boolean
  description: string | null
  ownerAccountId: string
  createdAt: number
}

export type PublicGroup = {
  conversationId: string
  title: string
  description: string | null
  ownerAccountId: string
  createdAt: number
  updatedAt: number
  memberCount: number
  handle: string | null
  handleNormalized: string | null
}

export type GroupRole = 'owner' | 'admin' | 'member'

export type GroupMember = {
  accountId: string
  role: GroupRole
  /** Bitmask of `PERM_*` flags; meaningless for the owner row. */
  permissions: number
  mutedUntil: number | null
  joinedAt: number
}

export type GroupHandle = {
  handle: string
  handleNormalized: string
}

export type GroupByHandle = {
  conversationId: string
  title: string
  description: string | null
  memberCount: number
  alreadyMember: boolean
}

export type CreateGroupInput = {
  title: string
  memberIds: string[]
  isPublic: boolean
  description: string | null
}

export function createGroup(account: AccountAuth, input: CreateGroupInput): Promise<GroupCreated> {
  return post<GroupCreated>(
    '/groups',
    {
      title: input.title,
      member_ids: input.memberIds,
      is_public: input.isPublic,
      description: input.description,
    },
    { account },
  )
}

export function listPublicGroups(account: AccountAuth, limit?: number): Promise<PublicGroup[]> {
  return get<PublicGroup[]>('/groups/public', {
    account,
    query: { limit: limit ?? null },
  })
}

/** Idempotent: joining a group you are already in is not an error. */
export function joinGroup(account: AccountAuth, conversationId: string): Promise<void> {
  return post<void>(`/groups/${encodeURIComponent(conversationId)}/join`, undefined, { account })
}

export function getGroupByHandle(account: AccountAuth, handle: string): Promise<GroupByHandle> {
  return get<GroupByHandle>(`/groups/by-handle/${encodeURIComponent(handle)}`, { account })
}

export function listGroupMembers(
  account: AccountAuth,
  conversationId: string,
): Promise<GroupMember[]> {
  return get<GroupMember[]>(`/groups/${encodeURIComponent(conversationId)}/members`, { account })
}

export function setMemberRole(
  account: AccountAuth,
  conversationId: string,
  target: { targetAccountId: string; role: 'admin' | 'member'; permissions: number },
): Promise<void> {
  return post<void>(
    `/groups/${encodeURIComponent(conversationId)}/members/role`,
    {
      target_account_id: target.targetAccountId,
      role: target.role,
      permissions: target.permissions,
    },
    { account },
  )
}

/** `mutedUntil = null` unmutes. */
export function muteMember(
  account: AccountAuth,
  conversationId: string,
  target: { targetAccountId: string; mutedUntil: number | null },
): Promise<void> {
  return post<void>(
    `/groups/${encodeURIComponent(conversationId)}/members/mute`,
    { target_account_id: target.targetAccountId, muted_until: target.mutedUntil },
    { account },
  )
}

export function setGroupHandle(
  account: AccountAuth,
  conversationId: string,
  handle: string,
): Promise<GroupHandle> {
  return post<GroupHandle>(
    `/groups/${encodeURIComponent(conversationId)}/profile`,
    { handle },
    { account },
  )
}

// ---------------------------------------------------------------------------
// Invites
//
// The subphase file list has no invites module; they live here because a group
// is where they are created *and* joined — `POST /invites/join/{token}` refuses
// channels outright (channels are joined with `subscribeChannel`). Creation also
// works for channels, which is why the endpoint takes a plain conversation id.
// ---------------------------------------------------------------------------

export type InviteKind = 'permanent' | 'one_time'

export type Invite = {
  id: string
  token: string
  kind: InviteKind
  usedCount: number
  /** `1` for a one-time invite, `null` for a permanent one. */
  maxUses: number | null
  createdAt: number
}

export function createInvite(
  account: AccountAuth,
  conversationId: string,
  kind: InviteKind,
): Promise<Invite> {
  return post<Invite>(
    `/conversations/${encodeURIComponent(conversationId)}/invites`,
    { kind },
    { account },
  )
}

export function listInvites(account: AccountAuth, conversationId: string): Promise<Invite[]> {
  return get<Invite[]>(`/conversations/${encodeURIComponent(conversationId)}/invites`, { account })
}

export function revokeInvite(account: AccountAuth, inviteId: string): Promise<void> {
  return del<void>(`/invites/${encodeURIComponent(inviteId)}`, undefined, { account })
}

/** Groups only: the endpoint answers `bad_request` for a channel invite. */
export function joinByInvite(account: AccountAuth, token: string): Promise<string> {
  return post<{ conversationId: string }>(
    `/invites/join/${encodeURIComponent(token)}`,
    undefined,
    { account },
  ).then((response) => response.conversationId)
}

