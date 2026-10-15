import { getSavedConversation, getSavedMessages, type SavedEnvelope } from '../api/saved'
import { getConversation, saveConversations } from '../storage/conversations'
import type { ConversationRecord, MessageRecord } from '../storage/db'
import type { HistoryCursor } from '../api/pagination'
import { restoreEnvelopePage } from './httpHistory'
import { getSetting, setSetting } from '../storage/settings'
import type { Account } from '../types'
import type { IdentityChange } from '../wasm'

/**
 * Saved Messages (API_FRONTEND.txt §10): the conversation an account has with
 * itself.
 *
 * The history endpoint returns envelopes addressed to *this* device, so they are
 * replayed through the ordinary receive path — the same decryption, the same
 * sender-key and attachment-key handling, the same snapshot persistence.
 */

/**
 * History page size; the server caps it at 500.
 *
 * Exported because the caller that pages further has to know what a full page
 * looks like — anything shorter is the end of the history.
 */
export const SAVED_PAGE_SIZE = 100

/** Remembers which conversation is this account's saved one. */
function savedConversationSettingKey(accountId: string): string {
  return `saved_conversation:${accountId}`
}

/**
 * The saved conversation, created on first use and cached locally afterwards.
 *
 * `GET /saved` is idempotent, so the cache is only there to keep the row (and
 * its `kind`) available to the chat list without a network round trip.
 */
export async function getOrCreateSavedConversation(account: Account): Promise<ConversationRecord> {
  const cachedId = await getSetting(savedConversationSettingKey(account.id))
  if (cachedId !== null) {
    const cached = await getConversation(account.id, cachedId)
    if (cached !== null) {
      return cached
    }
  }

  const saved = await getSavedConversation(account)
  const record: ConversationRecord = {
    id: saved.conversationId,
    accountId: account.id,
    kind: 'saved',
    title: null,
    // A conversation with yourself has no picture of its own.
    avatarUrl: null,
    // Only this account is in it.
    memberCount: 1,
    lastEnvelopeAt: null,
    createdAt: saved.createdAt,
    updatedAt: saved.createdAt,
    archivedAt: null,
    mutedUntil: null,
  }

  await saveConversations([record])
  await setSetting(savedConversationSettingKey(account.id), record.id)
  return record
}

export type SavedHistoryPage = {
  messages: MessageRecord[]
  cursor: HistoryCursor | null
  hasOlder: boolean
  unavailable: number
  identityChanges: IdentityChange[]
}

/** Page boundaries come from raw envelopes, including control-only pages. */
export async function loadSavedHistory(
  account: Account,
  query: Partial<HistoryCursor> = {},
): Promise<SavedHistoryPage> {
  const conversation = await getOrCreateSavedConversation(account)
  const envelopes = await getSavedMessages(account, { ...query, limit: SAVED_PAGE_SIZE })
  const restored = await restoreEnvelopePage(account, conversation.id,
    envelopes.map((row) => ({ ...row, conversationId: conversation.id })))
  const last: SavedEnvelope | undefined = envelopes.at(-1)
  return {
    messages: restored.available,
    cursor: last ? { before: last.serverTimestamp, beforeId: last.envelopeId } : null,
    hasOlder: envelopes.length >= SAVED_PAGE_SIZE,
    unavailable: restored.unavailable,
    identityChanges: restored.identityChanges,
  }
}
