import type { AccountAuth } from './auth'
import { get } from './client'

/**
 * Saved Messages (API_FRONTEND.txt §10) — the conversation an account has with
 * itself. Kept in its own module because the rules differ from every other
 * conversation: no invites, no presence, no reactions, and no TTL cleanup.
 *
 * `getSavedConversation`/`getSavedMessages` live here and not in
 * `conversations.ts`, which the subphase spec also mentioned: one endpoint
 * should have one implementation.
 */

export type SavedConversation = {
  conversationId: string
  kind: 'saved'
  createdAt: number
}

export type SavedEnvelope = {
  envelopeId: string
  senderAccountId: string
  senderDeviceNumber: number
  recipientDeviceNumber: number
  envelopeType: number
  isPrekeyMessage: boolean
  ciphertext: string
  clientTimestamp: number
  serverTimestamp: number
}

/** Idempotent: creates the conversation on first use and returns its id. */
export function getSavedConversation(account: AccountAuth): Promise<SavedConversation> {
  return get<SavedConversation>('/saved', { account })
}

/**
 * History for the *current* device, newest first.
 *
 * `before` is the `serverTimestamp` of the last envelope of the previous page.
 * Answers 404 when the saved conversation has not been created yet.
 */
export function getSavedMessages(
  account: AccountAuth,
  query: { before?: number; limit?: number } = {},
): Promise<SavedEnvelope[]> {
  return get<{ envelopes: SavedEnvelope[] }>('/saved/messages', {
    account,
    query: { before: query.before ?? null, limit: query.limit ?? null },
  }).then((response) => response.envelopes)
}
