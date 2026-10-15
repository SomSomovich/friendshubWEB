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

export const REACTIONS_PAGE_SIZE = 200
export type ReactionCursor = { beforeCreatedAt: number; beforeActorId: string }
/** Newest first, ordered by (created_at, actor_id). */
export function listPostReactions(account: AccountAuth, postId: string,
  query: Partial<ReactionCursor> & { limit?: number } = {}): Promise<PostReaction[]> {
  return get(`/channel-posts/${encodeURIComponent(postId)}/reactions`, { account,
    query: { before_created_at: query.beforeCreatedAt, before_actor_id: query.beforeActorId, limit: query.limit ?? REACTIONS_PAGE_SIZE } })
}

/** Fetching a single post registers a unique view for the owner analytics. */
export function getChannelPost(account: AccountAuth, postId: string): Promise<ChannelPost> {
  return get(`/channel-posts/${encodeURIComponent(postId)}`, { account })
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
