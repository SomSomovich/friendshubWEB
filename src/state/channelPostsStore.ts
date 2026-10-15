import { create } from 'zustand'
import type { ChannelPost } from '../api/channel_posts'

type ChannelPostsState = {
  feeds: Record<string, ChannelPost[]>
  refreshVersions: Record<string, number>
  invalidate: (accountId: string) => void
  clearAccount: (accountId: string) => void
  merge: (accountId: string, channelId: string, posts: ChannelPost[], replace?: boolean) => void
  reconcile: (accountId: string, channelId: string, posts: ChannelPost[], snapshot: ChannelPost[], before?: string) => void
  remove: (accountId: string, channelId: string, postId: string) => void
}
export const channelFeedKey = (accountId: string, channelId: string) => `${accountId}:${channelId}`
export const EMPTY_CHANNEL_POSTS: ChannelPost[] = []
export const useChannelPostsStore = create<ChannelPostsState>((set) => ({
  feeds: {},
  refreshVersions: {},
  invalidate: (accountId) => set((state) => ({ refreshVersions: { ...state.refreshVersions, [accountId]: (state.refreshVersions[accountId] ?? 0) + 1 } })),
  clearAccount: (accountId) => set((state) => ({ feeds: Object.fromEntries(Object.entries(state.feeds).filter(([key]) => !key.startsWith(`${accountId}:`))) })),
  merge: (accountId, channelId, posts, replace = false) => set((state) => {
    const key = channelFeedKey(accountId, channelId)
    const existing = state.feeds[key] ?? []
    const ordered = replace ? [...existing, ...posts] : [...posts, ...existing]
    const unique = new Map(ordered.filter((post) => post.channelId === channelId).map((post) => [post.id, post]))
    return { feeds: { ...state.feeds, [key]: [...unique.values()].sort((a, b) => b.id.localeCompare(a.id)) } }
  }),
  reconcile: (accountId, channelId, posts, snapshot, before) => set((state) => {
    const key = channelFeedKey(accountId, channelId)
    const current = new Map((state.feeds[key] ?? []).map((post) => [post.id, post]))
    const previous = new Map(snapshot.map((post) => [post.id, post]))
    const incoming = new Map(posts.filter((post) => post.channelId === channelId).map((post) => [post.id, post]))
    const lowest = posts.at(-1)?.id
    for (const post of snapshot) {
      const withinPage = (before === undefined || post.id < before) && (posts.length < 50 || (lowest !== undefined && post.id >= lowest))
      if (withinPage && !incoming.has(post.id) && current.get(post.id) === post) current.delete(post.id)
    }
    for (const [id, post] of incoming) {
      // A live arrival, local edit or deletion after the HTTP request wins.
      if (current.get(id) === previous.get(id)) current.set(id, post)
    }
    return { feeds: { ...state.feeds, [key]: [...current.values()].sort((a, b) => b.id.localeCompare(a.id)) } }
  }),
  remove: (accountId, channelId, postId) => set((state) => {
    const key = channelFeedKey(accountId, channelId)
    return { feeds: { ...state.feeds, [key]: (state.feeds[key] ?? []).filter((post) => post.id !== postId) } }
  }),
}))
