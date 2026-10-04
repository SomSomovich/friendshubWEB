import { getSavedConversation, getSavedMessages, type SavedEnvelope } from '../api/saved'
import { getConversation, saveConversations } from '../storage/conversations'
import type { ConversationRecord, MessageRecord } from '../storage/db'
import { saveMessages } from '../storage/messages'
import { getSetting, setSetting } from '../storage/settings'
import type { Account, Envelope } from '../types'
import { buildMessageRecord, handleEnvelope } from './receive'

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

/**
 * Loads one page of saved history, newest first, storing what it decrypts.
 *
 * `before` is the `serverTimestamp` of the previous page's last envelope.
 */
export async function loadSavedHistory(
  account: Account,
  before?: number,
): Promise<MessageRecord[]> {
  const conversation = await getOrCreateSavedConversation(account)
  const envelopes = await getSavedMessages(account, { before, limit: SAVED_PAGE_SIZE })

  const messages: MessageRecord[] = []

  for (const savedEnvelope of envelopes) {
    const envelope = toEnvelope(account, conversation.id, savedEnvelope)
    const received = await handleEnvelope(account, envelope)

    // Sender-key and attachment-key envelopes are applied inside `handleEnvelope`
    // and carry no text of their own.
    if (received.kind !== 'message') {
      continue
    }

    messages.push(
      buildMessageRecord(
        account,
        conversation.id,
        envelope,
        received.plaintext ?? '',
        // It reached the server and came back: from this device's point of view
        // it is delivered, and there is no receipt channel for saved messages.
        'sent',
        savedEnvelope.serverTimestamp,
      ),
    )
  }

  await saveMessages(messages)
  return messages
}

/**
 * The history endpoint carries the envelope fields without the routing ones: the
 * recipient is this device by construction, and the conversation is the saved
 * one.
 */
function toEnvelope(account: Account, conversationId: string, saved: SavedEnvelope): Envelope {
  return {
    envelopeId: saved.envelopeId,
    senderAccountId: saved.senderAccountId,
    senderDeviceNumber: saved.senderDeviceNumber,
    recipientAccountId: account.id,
    recipientDeviceNumber: saved.recipientDeviceNumber,
    envelopeType: saved.envelopeType,
    isPrekeyMessage: saved.isPrekeyMessage,
    ciphertext: saved.ciphertext,
    clientTimestamp: saved.clientTimestamp,
    conversationId,
    senderIsBot: false,
  }
}
