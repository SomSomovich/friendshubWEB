import type { AccountAuth } from './auth'
import { del, get, post } from './client'

/**
 * Pinned messages (API_FRONTEND.txt §11).
 *
 * Conversation state rather than something one device tells another, so it lives
 * on the server now and every device of every participant agrees. A pin names
 * its message by the logical id — the same id the payload contract uses — which
 * is why the store can key on it without translating anything.
 *
 * Channels are not covered here: a channel's posts are pinned by
 * `POST /channel-posts/{id}/pin`, and this endpoint answers 400 for one.
 */

export type PinnedMessage = {
  messageId: string
  pinnedByAccountId: string
  pinnedAt: number
}

/** Idempotent: a message already pinned comes back as success, not as an error. */
export function pinMessage(
  account: AccountAuth,
  conversationId: string,
  messageId: string,
): Promise<void> {
  return post<void>(
    `/conversations/${encodeURIComponent(conversationId)}/pinned`,
    { message_id: messageId },
    { account },
  )
}

export function unpinMessage(
  account: AccountAuth,
  conversationId: string,
  messageId: string,
): Promise<void> {
  return del<void>(
    `/conversations/${encodeURIComponent(conversationId)}/pinned/${encodeURIComponent(messageId)}`,
    undefined,
    { account },
  )
}

/** Newest pin first, which is the order the banner cycles through in reverse. */
export function listPinnedMessages(
  account: AccountAuth,
  conversationId: string,
): Promise<PinnedMessage[]> {
  return get<PinnedMessage[]>(`/conversations/${encodeURIComponent(conversationId)}/pinned`, {
    account,
  })
}
