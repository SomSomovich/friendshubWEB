import type { ActorType } from './channels'
import type { AccountAuth } from './auth'
import { del, get, patch, post } from './client'

export type ChannelPost = {
  id: string
  channelId: string
  authorType: ActorType
  authorId: string
  text: string
  attachmentIds: string[]
  forwardFrom: string | null
  replyToPostId: string | null
  createdAt: number
  editedAt: number | null
  pinnedAt: number | null
  discussionCommentCount: number
}

export type PostReaction = {
  actorType: ActorType
  actorId: string
  emoji: string
  createdAt: number
}

export type PostDiscussion = {
  channelId: string
  postId: string
  linkedGroupId: string | null
  threadId: string
  commentCount: number
}

export type CreatePostInput = {
  text: string
  attachmentIds: string[]
  replyToPostId: string | null
  forwardFrom: string | null
}

/**
 * Newest first, paged by the id of the last post of the previous page.
 *
 * The cursor used to be a unix timestamp, which skipped posts published in the
 * same second as the boundary — the ids are UUIDv7 now, so they order by
 * creation and are unique, and the boundary post is simply excluded.
 */
export function listChannelPosts(
  account: AccountAuth,
  channelId: string,
  query: { before?: string; limit?: number } = {},
): Promise<ChannelPost[]> {
  return get<ChannelPost[]>(`/channels/${encodeURIComponent(channelId)}/posts`, {
    account,
    query: { before: query.before ?? null, limit: query.limit ?? null },
  })
}

export function createChannelPost(
  account: AccountAuth,
  channelId: string,
  input: CreatePostInput,
): Promise<ChannelPost> {
  return post<ChannelPost>(
    `/channels/${encodeURIComponent(channelId)}/posts`,
    {
      text: input.text,
      attachment_ids: input.attachmentIds,
      reply_to_post_id: input.replyToPostId,
      forward_from: input.forwardFrom,
    },
    { account },
  )
}

export function editChannelPost(
  account: AccountAuth,
  postId: string,
  text: string,
): Promise<void> {
  return patch<void>(`/channel-posts/${encodeURIComponent(postId)}`, { text }, { account })
}

export function deleteChannelPost(account: AccountAuth, postId: string): Promise<void> {
  return del<void>(`/channel-posts/${encodeURIComponent(postId)}`, undefined, { account })
}

export function pinChannelPost(account: AccountAuth, postId: string): Promise<void> {
  return post<void>(`/channel-posts/${encodeURIComponent(postId)}/pin`, undefined, { account })
}

export function unpinChannelPost(account: AccountAuth, postId: string): Promise<void> {
  return del<void>(`/channel-posts/${encodeURIComponent(postId)}/pin`, undefined, { account })
}

export function listPinnedPosts(
  account: AccountAuth,
  channelId: string,
): Promise<ChannelPost[]> {
  return get<ChannelPost[]>(`/channels/${encodeURIComponent(channelId)}/pinned`, { account })
}

/**
 * Paginated by sequence number, newest first.
 *
 * `seq` is the server's own ordering column, not a timestamp: reactions made in
 * the same second are common, and a timestamp cursor would skip them.
 */
export function listPostReactions(
  account: AccountAuth,
  postId: string,
  query: { before?: number; limit?: number } = {},
): Promise<PostReaction[]> {
  return get<PostReaction[]>(`/channel-posts/${encodeURIComponent(postId)}/reactions`, {
    account,
    query: { before: query.before ?? null, limit: query.limit ?? null },
  })
}

/** One reaction per actor: a repeat replaces the previous emoji. */
export function addPostReaction(
  account: AccountAuth,
  postId: string,
  emoji: string,
): Promise<void> {
  return post<void>(
    `/channel-posts/${encodeURIComponent(postId)}/reactions`,
    { emoji },
    { account },
  )
}

export function removePostReaction(account: AccountAuth, postId: string): Promise<void> {
  return del<void>(`/channel-posts/${encodeURIComponent(postId)}/reactions`, undefined, { account })
}

export function getPostDiscussion(
  account: AccountAuth,
  postId: string,
): Promise<PostDiscussion> {
  return get<PostDiscussion>(`/channel-posts/${encodeURIComponent(postId)}/discussion`, { account })
}
