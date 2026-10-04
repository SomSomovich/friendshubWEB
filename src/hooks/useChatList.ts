import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { listContacts } from '../api/contacts'
import { getOrCreateSavedConversation } from '../crypto/saved'
import { requireAccountStore } from '../state/accountRegistry'
import {
  resolveConversationIdentity,
  type ContactName,
} from '../state/conversationIdentity'
import type { ConversationRecord } from '../storage/db'
import { countMessagesAfter, getMessages } from '../storage/messages'
import { listPinned } from '../storage/pinned'
import { loadHiddenConversations, loadPeerCache, loadReadState } from '../storage/read_state'
import type { Account } from '../types'

/**
 * Everything a chat row needs.
 *
 * Assembled from the store (the conversation list) plus local reads: the last
 * message, the unread count and whether anything is pinned live in IndexedDB,
 * and are read per row because none of them belongs on the conversation record
 * the server sends.
 */

export type ChatListRowData = {
  conversation: ConversationRecord
  /** Ready to display: a translated label, a contact name, or a fallback. */
  title: string
  avatarUrl: string | null
  preview: string | null
  /** Seconds of the last activity, for sorting and for the row's timestamp. */
  at: number | null
  unread: number
  muted: boolean
  /** True when the conversation holds pinned messages. */
  hasPinned: boolean
}

export type ChatListState = {
  rows: ChatListRowData[]
  loading: boolean
  error: string | null
  /** Re-reads the local per-conversation state, e.g. after marking something read. */
  reload: () => void
}

export function useChatList(account: Account): ChatListState {
  const { t } = useTranslation()
  const store = requireAccountStore(account.id)
  const conversations = useStore(store, (state) => state.conversations)
  // Bumped by the send and receive paths, so a message written to a background
  // conversation refreshes this list without a polling loop.
  const messagesVersion = useStore(store, (state) => state.messagesVersion)

  // The conversation list comes from the server; nothing else loads it, and a
  // failure is the store's to report, so it is not awaited here.
  useEffect(() => {
    void store.getState().actions.loadConversations()
  }, [store])

  const [rows, setRows] = useState<ChatListRowData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        if (!cancelled) {
          setLoading(true)
        }
        const [saved, readState, peers, contacts, hidden] = await Promise.all([
          // Ensures the Saved conversation exists, so it is always in the list.
          getOrCreateSavedConversation(account),
          loadReadState(account.id),
          loadPeerCache(account.id),
          listContacts(account).catch(() => []),
          loadHiddenConversations(account.id),
        ])

        const byAccountId = new Map(contacts.map((contact) => [contact.targetAccountId, contact]))
        const all = conversations.some((entry) => entry.id === saved.id)
          ? conversations
          : [...conversations, saved]

        const assembled = await Promise.all(
          all.map((conversation) =>
            assembleRow(account, conversation, {
              readState,
              peers,
              contacts: byAccountId,
              savedTitle: t('chatList.saved'),
              unknownTitle: t('chatList.unknownPeer'),
            }),
          ),
        )

        if (!cancelled) {
          setRows(assembled.filter((row) => !isHidden(row, hidden)))
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          console.error('[chat list] could not assemble the rows', cause)
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [account, conversations, messagesVersion, reloadToken, t])

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1)
  }, [])

  return { rows: sortRows(rows), loading, error, reload }
}

/**
 * A removed conversation stays gone until something happens in it afterwards.
 *
 * That is what makes a local delete stick: the server has no endpoint for it and
 * would hand the row straight back on the next sync, so the removal is recorded
 * as a moment in time and compared against the last activity — and the chat
 * reappears the way it should, when the other side writes again.
 */
function isHidden(row: ChatListRowData, hidden: Record<string, number>): boolean {
  const hiddenAt = hidden[row.conversation.id]
  if (hiddenAt === undefined) {
    return false
  }
  return (row.at ?? row.conversation.updatedAt) <= hiddenAt
}

type AssembleContext = {
  readState: Record<string, number>
  peers: Record<string, string>
  contacts: Map<string, ContactName>
  savedTitle: string
  unknownTitle: string
}

async function assembleRow(
  account: Account,
  conversation: ConversationRecord,
  context: AssembleContext,
): Promise<ChatListRowData> {
  const [lastPage, unread, pinned] = await Promise.all([
    getMessages(account.id, conversation.id, { limit: 1 }),
    countMessagesAfter(account.id, conversation.id, context.readState[conversation.id] ?? 0),
    listPinned(account.id, conversation.id),
  ])

  const last = lastPage.at(0)
  const identity = await resolveConversationIdentity(account, conversation, context.contacts, context.peers, {
    saved: context.savedTitle,
    unknown: context.unknownTitle,
  })

  return {
    conversation,
    title: identity.title,
    avatarUrl: identity.avatarUrl,
    preview: last?.plaintext ?? null,
    at: last?.clientTimestamp ?? conversation.lastEnvelopeAt,
    unread,
    muted: conversation.mutedUntil !== null,
    hasPinned: pinned.length > 0,
  }
}

/**
 * Most recent activity first, with Saved pinned to the top — it is the
 * conversation an account has with itself, and burying it in the chronology
 * makes it harder to find than it is to use.
 */
function sortRows(rows: ChatListRowData[]): ChatListRowData[] {
  return [...rows].sort((left, right) => {
    if (left.conversation.kind === 'saved' && right.conversation.kind !== 'saved') {
      return -1
    }
    if (right.conversation.kind === 'saved' && left.conversation.kind !== 'saved') {
      return 1
    }
    return (right.at ?? right.conversation.updatedAt) - (left.at ?? left.conversation.updatedAt)
  })
}
