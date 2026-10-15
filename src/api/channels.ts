import type { AccountAuth } from './auth'
import { del, get, post } from './client'

export type ChannelCreated = {
  conversationId: string
  title: string
  description: string | null
  ownerAccountId: string
  linkedGroupConversationId: string | null
  isPublic: boolean
  createdAt: number
}

/** Channels admit accounts and bots; every member-shaped row says which. */
export type ActorType = 'account' | 'bot'

export type ChannelMember = {
  actorType: ActorType
  actorId: string
  role: 'owner' | 'admin' | 'subscriber'
  joinedAt: number
}

export type ChannelHandle = {
  handle: string
  handleNormalized: string
}

export type CreateChannelInput = {
  title: string
  description: string | null
  isPublic: boolean
}

export function createChannel(
  account: AccountAuth,
  input: CreateChannelInput,
): Promise<ChannelCreated> {
  return post<ChannelCreated>(
    '/channels',
    { title: input.title, description: input.description, is_public: input.isPublic },
    { account },
  )
}

export function listChannelMembers(
  account: AccountAuth,
  channelId: string,
): Promise<ChannelMember[]> {
  return get<ChannelMember[]>(`/channels/${encodeURIComponent(channelId)}/members`, { account })
}

export function setChannelMemberRole(
  account: AccountAuth,
  channelId: string,
  target: { actorType: ActorType; actorId: string; role: 'admin' | 'subscriber' },
): Promise<void> {
  return post<void>(
    `/channels/${encodeURIComponent(channelId)}/members/role`,
    { actor_type: target.actorType, actor_id: target.actorId, role: target.role },
    { account },
  )
}

export function removeChannelMember(
  account: AccountAuth,
  channelId: string,
  target: { actorType: ActorType; actorId: string },
): Promise<void> {
  return post<void>(
    `/channels/${encodeURIComponent(channelId)}/members/remove`,
    { actor_type: target.actorType, actor_id: target.actorId },
    { account },
  )
}

/** `linkedGroupConversationId = null` detaches the discussion group. */
export function setLinkedGroup(
  account: AccountAuth,
  channelId: string,
  linkedGroupConversationId: string | null,
): Promise<void> {
  return post<void>(
    `/channels/${encodeURIComponent(channelId)}/linked-group`,
    { linked_group_conversation_id: linkedGroupConversationId },
    { account },
  )
}

export function setChannelPublic(
  account: AccountAuth,
  channelId: string,
  isPublic: boolean,
): Promise<void> {
  return post<void>(
    `/channels/${encodeURIComponent(channelId)}/public`,
    { is_public: isPublic },
    { account },
  )
}

export function setChannelHandle(
  account: AccountAuth,
  channelId: string,
  handle: string,
): Promise<ChannelHandle> {
  return post<ChannelHandle>(
    `/channels/${encodeURIComponent(channelId)}/profile`,
    { handle },
    { account },
  )
}

export function addChannelBot(
  account: AccountAuth,
  channelId: string,
  botId: string,
): Promise<void> {
  return post<void>(
    `/channels/${encodeURIComponent(channelId)}/bots`,
    { bot_id: botId },
    { account },
  )
}

/** Publishing rights: owner or admin of the channel. */
export function canPublish(account: AccountAuth, channelId: string): Promise<boolean> {
  return get<{ canPublish: boolean }>(`/channels/${encodeURIComponent(channelId)}/can-publish`, {
    account,
  }).then((response) => response.canPublish)
}

/** Idempotent; the owner cannot unsubscribe from their own channel. */
export function subscribeChannel(account: AccountAuth, channelId: string): Promise<void> {
  return post<void>(`/channels/${encodeURIComponent(channelId)}/subscribe`, undefined, { account })
}

export function unsubscribeChannel(account: AccountAuth, channelId: string): Promise<void> {
  return del<void>(`/channels/${encodeURIComponent(channelId)}/subscribe`, undefined, { account })
}

export type ChannelDetail = ChannelCreated & {
  handle: string | null
  handleNormalized: string | null
  memberCount: number
  updatedAt: number
}
export type PublicChannel = Omit<ChannelDetail, 'isPublic' | 'linkedGroupConversationId'>
export type ChannelByHandle = {
  conversationId: string; title: string; description: string | null
  memberCount: number; alreadyMember: boolean
}
export type ChannelAnalytics = { posts: { postId: string; views: number }[] }

export function getChannel(account: AccountAuth, channelId: string): Promise<ChannelDetail> {
  return get(`/channels/${encodeURIComponent(channelId)}`, { account })
}
export function listPublicChannels(account: AccountAuth, limit = 50): Promise<PublicChannel[]> {
  return get('/channels/public', { account, query: { limit } })
}
export function getChannelByHandle(account: AccountAuth, handle: string): Promise<ChannelByHandle> {
  return get(`/channels/by-handle/${encodeURIComponent(handle)}`, { account })
}
export function deleteChannel(account: AccountAuth, channelId: string): Promise<void> {
  return del(`/channels/${encodeURIComponent(channelId)}`, undefined, { account })
}
export function transferChannelOwnership(account: AccountAuth, channelId: string, newOwnerAccountId: string): Promise<void> {
  return post(`/channels/${encodeURIComponent(channelId)}/owner`, { new_owner_account_id: newOwnerAccountId }, { account })
}
export function getChannelAnalytics(account: AccountAuth, channelId: string): Promise<ChannelAnalytics> {
  return get(`/channels/${encodeURIComponent(channelId)}/analytics`, { account })
}
