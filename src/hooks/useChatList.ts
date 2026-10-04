import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { getConversation } from '../api/conversations'
import { listContacts } from '../api/contacts'
import { avatarImageUrl } from '../api/avatars'
import { getOrCreateSavedConversation } from '../crypto/saved'
import { requireAccountStore } from '../state/accountRegistry'
import type { ConversationRecord } from '../storage/db'
import { countMessagesAfter, getMessages } from '../storage/messages'
import { listPinned } from '../storage/pinned'
import { loadPeerCache, loadReadState, rememberPeer } from '../storage/read_state'
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
  // Bumped by the receive path, so a message arriving in a background
  // conversation refreshes this list without a polling loop.
  const incomingCounter = useStore(store, (state) => state.incomingCounter)

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
        const [saved, readState, peers, contacts] = await Promise.all([
          // Ensures the Saved conversation exists, so it is always in the list.
          getOrCreateSavedConversation(account),
          loadReadState(account.id),
          loadPeerCache(account.id),
          listContacts(account).catch(() => []),
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
          setRows(assembled)
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
  }, [account, conversations, incomingCounter, reloadToken, t])

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1)
  }, [])

  return { rows: sortRows(rows), loading, error, reload }
}

type AssembleContext = {
  readState: Record<string, number>
  peers: Record<string, string>
  contacts: Map<string, { username: string; localUsername: string | null; avatarUrl: string | null }>
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
  const identity = await resolveIdentity(account, conversation, context)

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

/** The display name and avatar for a row, per conversation kind. */
async function resolveIdentity(
  account: Account,
  conversation: ConversationRecord,
  context: AssembleContext,
): Promise<{ title: string; avatarUrl: string | null }> {
  if (conversation.kind === 'saved') {
    return { title: context.savedTitle, avatarUrl: null }
  }

  if (conversation.kind === 'direct') {
    const peerId = await resolvePeerAccountId(account, conversation, context.peers)
    if (peerId === null) {
      return { title: context.unknownTitle, avatarUrl: null }
    }
    const contact = context.contacts.get(peerId)
    return {
      title: contact?.localUsername ?? contact?.username ?? context.unknownTitle,
      avatarUrl: avatarImageUrl(peerId),
    }
  }

  return {
    title: conversation.title ?? context.unknownTitle,
    avatarUrl: avatarImageUrl(conversation.id),
  }
}

/**
 * Which account a direct conversation is with.
 *
 * The list endpoint does not say, so the detail is fetched once and remembered;
 * a failure returns `null` rather than throwing, because one unknown row must
 * not empty the whole list.
 */
async function resolvePeerAccountId(
  account: Account,
  conversation: ConversationRecord,
  known: Record<string, string>,
): Promise<string | null> {
  const cached = known[conversation.id]
  if (cached !== undefined) {
    return cached
  }

  try {
    const detail = await getConversation(account, conversation.id)
    const peerId = detail.members.find((member) => member !== account.id) ?? null
    if (peerId !== null) {
      await rememberPeer(account.id, conversation.id, peerId)
    }
    return peerId
  } catch (error) {
    console.warn(`[chat list] could not resolve the peer of ${conversation.id}`, error)
    return null
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
