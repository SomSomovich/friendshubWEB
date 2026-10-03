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
  memberCount: number
  lastEnvelopeAt: number | null
  createdAt: number
  updatedAt: number
  archivedAt: number | null
  /** Unix seconds; `null` means notifications are not muted. */
  mutedUntil: number | null
}
