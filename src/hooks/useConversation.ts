import { useCallback, useEffect, useState } from 'react'
import { avatarImageUrl } from '../api/avatars'
import { listContacts, type Contact } from '../api/contacts'
import { requireAccountStore } from '../state/accountRegistry'
import { resolvePeerAccountId } from '../state/conversationIdentity'
import { getConversation } from '../storage/conversations'
import type { ConversationRecord } from '../storage/db'
import { loadPeerCache } from '../storage/read_state'
import type { Account } from '../types'
import { useStore } from 'zustand'

/**
 * The conversation a route points at, plus everything needed to name it.
 *
 * The record is looked up in the store first — it is already there for anything
 * the list shows — and read from IndexedDB otherwise, so a deep link still
 * works after a reload. The peer id comes from the detail endpoint, which is the
 * only place that says who a direct conversation is with.
 */

export type ConversationView = {
  conversation: ConversationRecord | null
  /** The other member of a direct conversation; `null` for every other kind. */
  peerAccountId: string | null
  /** The name this account saved for the peer, when there is one. */
  contactName: string | null
  avatarUrl: string | null
  /** True until the first lookup finishes. */
  loading: boolean
  /** Re-reads the name, e.g. after the peer was added to or removed from contacts. */
  refresh: () => void
}

type Loaded = {
  conversationId: string
  conversation: ConversationRecord | null
  peerAccountId: string | null
  contactName: string | null
  avatarUrl: string | null
}

export function useConversation(account: Account, conversationId: string): ConversationView {
  const store = requireAccountStore(account.id)
  const conversations = useStore(store, (state) => state.conversations)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [token, setToken] = useState(0)

  // A conversation opened by a link is often not in the store yet: the list is
  // what puts it there, and nothing else loads it.
  useEffect(() => {
    if (conversations.length === 0) {
      void store.getState().actions.loadConversations()
    }
  }, [store, conversations.length])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const known = conversations.find((entry) => entry.id === conversationId)
      const conversation = known ?? (await getConversation(account.id, conversationId))

      let peerAccountId: string | null = null
      let contactName: string | null = null

      if (conversation?.kind === 'direct') {
        const [peers, contacts] = await Promise.all([
          loadPeerCache(account.id),
          listContacts(account).catch((): Contact[] => []),
        ])
        peerAccountId = await resolvePeerAccountId(account, conversation, peers)
        const contact = contacts.find((entry) => entry.targetAccountId === peerAccountId)
        contactName = contact?.localUsername ?? contact?.username ?? null
      }

      if (cancelled) {
        return
      }
      setLoaded({
        conversationId,
        conversation,
        peerAccountId,
        contactName,
        avatarUrl: avatarUrlFor(conversation, peerAccountId),
      })
    })()

    return () => {
      cancelled = true
    }
  }, [account, conversationId, conversations, token])

  const refresh = useCallback(() => {
    setToken((value) => value + 1)
  }, [])

  // A record left over from another conversation must not be shown while the
  // new one is being read: the header would name the wrong chat.
  const current = loaded !== null && loaded.conversationId === conversationId ? loaded : null

  return {
    conversation: current?.conversation ?? null,
    peerAccountId: current?.peerAccountId ?? null,
    contactName: current?.contactName ?? null,
    avatarUrl: current?.avatarUrl ?? null,
    loading: current === null,
    refresh,
  }
}

function avatarUrlFor(
  conversation: ConversationRecord | null,
  peerAccountId: string | null,
): string | null {
  if (conversation === null || conversation.kind === 'saved') {
    return null
  }
  if (conversation.kind === 'direct') {
    return peerAccountId === null ? null : avatarImageUrl(peerAccountId)
  }
  return avatarImageUrl(conversation.id)
}
