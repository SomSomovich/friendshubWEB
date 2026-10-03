import type { Conversation, ConversationKind } from '../types'
import type { AccountAuth } from './auth'
import { del, get, post } from './client'

/**
 * The list and detail responses carry exactly the fields of the domain type
 * (plus `members`), so camel casing lines them up without a mapper.
 *
 * The saved conversation lives in `saved.ts`; nothing here duplicates it.
 */

export type DirectConversationRef = {
  id: string
  kind: 'direct'
}

export type ConversationDetail = {
  id: string
  kind: ConversationKind
  title: string | null
  /** Absent for `direct` and `saved`, where nobody created the conversation. */
  createdBy: string | null
  createdAt: number
  updatedAt: number
  members: string[]
}

export function listConversations(account: AccountAuth): Promise<Conversation[]> {
  return get<Conversation[]>('/conversations', { account })
}

/** Idempotent: the same peer always resolves to the same conversation. */
export function createDirectConversation(
  account: AccountAuth,
  peerFhNumber: string,
): Promise<DirectConversationRef> {
  return post<DirectConversationRef>(
    '/conversations/direct',
    { peer_fh_number: peerFhNumber },
    { account },
  )
}

export function getConversation(
  account: AccountAuth,
  conversationId: string,
): Promise<ConversationDetail> {
  return get<ConversationDetail>(`/conversations/${encodeURIComponent(conversationId)}`, {
    account,
  })
}

export function leaveConversation(account: AccountAuth, conversationId: string): Promise<void> {
  return post<void>(`/conversations/${encodeURIComponent(conversationId)}/leave`, undefined, {
    account,
  })
}

export function archiveConversation(account: AccountAuth, conversationId: string): Promise<void> {
  return post<void>(`/conversations/${encodeURIComponent(conversationId)}/archive`, undefined, {
    account,
  })
}

export function unarchiveConversation(account: AccountAuth, conversationId: string): Promise<void> {
  return del<void>(`/conversations/${encodeURIComponent(conversationId)}/archive`, undefined, {
    account,
  })
}

/** `durationSeconds = null` mutes until further notice; `0` is rejected by the server. */
export function muteConversation(
  account: AccountAuth,
  conversationId: string,
  durationSeconds: number | null,
): Promise<void> {
  return post<void>(
    `/conversations/${encodeURIComponent(conversationId)}/mute`,
    { duration_seconds: durationSeconds },
    { account },
  )
}

export function unmuteConversation(account: AccountAuth, conversationId: string): Promise<void> {
  return del<void>(`/conversations/${encodeURIComponent(conversationId)}/mute`, undefined, {
    account,
  })
}
