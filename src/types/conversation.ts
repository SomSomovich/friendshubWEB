/**
 * `saved` behaves like a direct chat with yourself and bypasses TTL cleanup;
 * the other three mirror the server's `kind` field.
 */
export type ConversationKind = 'direct' | 'group' | 'channel' | 'saved'

export type Conversation = {
  id: string
  kind: ConversationKind
  /** Server-provided title; `null` for direct chats (name comes from contacts). */
  title: string | null
  /**
   * The group's or channel's own picture, as a path on the API's origin — or
   * `null`. Only groups and channels have one, and only once somebody set it,
   * which is what makes this worth carrying: without it every row would request
   * a 404 to find out.
   */
  avatarUrl: string | null
  memberCount: number
  lastEnvelopeAt: number | null
  createdAt: number
  updatedAt: number
  archivedAt: number | null
  /** Unix seconds; `null` means notifications are not muted. */
  mutedUntil: number | null
}
