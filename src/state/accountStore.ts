import { createStore, type StoreApi } from 'zustand/vanilla'
import { listConversations } from '../api/conversations'
import {
  buildLocalMessageRecord,
  resolveDirectPeer,
  sendGroupMessage,
  sendMessage as sendDirectMessage,
  sendToSaved as sendSavedMessage,
} from '../crypto/send'
import { loadSavedHistory } from '../crypto/saved'
import { listConversations as readConversations, saveConversations } from '../storage/conversations'
import type { ConversationRecord, MessageRecord } from '../storage/db'
import { getMessages, saveMessage } from '../storage/messages'
import type { Account, Envelope } from '../types'
import { nowSeconds } from '../utils/time'
import { requireActiveClient } from '../ws/activeClient'
import { clearIdentityChanges, type IdentityChange } from '../wasm'
import type { PresenceEvent } from '../ws/events'
import { applyReceivedEnvelope, mergeById } from './applyEnvelope'

/**
 * Everything one account knows: its conversation list, the open message window,
 * presence, typing indicators and the send/receive actions.
 *
 * One store per account, created on demand and never shared — the point of the
 * multi-account model (brief §8) is that accounts cannot see each other. The
 * store holds no React state and touches no DOM, so it also runs in Node.
 */

const MESSAGE_PAGE_SIZE = 50
/** How long a typing indicator stays visible after the last signal. */
const TYPING_TTL_SECONDS = 5

export type AccountStoreState = {
  accountId: string
  conversations: ConversationRecord[]
  /** The open conversation's window, newest first. */
  messages: MessageRecord[]
  activeConversationId: string | null
  /** Latest presence per peer account id. */
  presence: Record<string, PresenceEvent>
  /** Conversation id → unix seconds until which the peer is typing. */
  typing: Record<string, number>
  /** Unacknowledged peer identity changes; cleared by `acknowledgeIdentityChanges`. */
  identityChanges: IdentityChange[]
  loadingConversations: boolean
  loadingMessages: boolean
  sending: boolean
  error: string | null
}

export type AccountActions = {
  loadConversations: () => Promise<void>
  openConversation: (conversationId: string) => Promise<void>
  loadOlderMessages: () => Promise<void>
  sendText: (plaintext: string) => Promise<void>
  sendToSaved: (plaintext: string) => Promise<void>
  applyEnvelope: (envelope: Envelope) => Promise<void>
  setPresence: (event: PresenceEvent) => void
  setTyping: (conversationId: string) => void
  acknowledgeIdentityChanges: () => Promise<void>
  reset: () => void
}

export type AccountStore = AccountStoreState & { actions: AccountActions }

/** True while a peer's typing indicator has not expired. */
export function typingIsActive(untilSeconds: number, now: number = nowSeconds()): boolean {
  return untilSeconds > now
}

export function createAccountStore(account: Account): StoreApi<AccountStore> {
  const initialState: AccountStoreState = {
    accountId: account.id,
    conversations: [],
    messages: [],
    activeConversationId: null,
    presence: {},
    typing: {},
    identityChanges: [],
    loadingConversations: false,
    loadingMessages: false,
    sending: false,
    error: null,
  }

  return createStore<AccountStore>((set, get) => ({
    ...initialState,

    actions: {
      async loadConversations() {
        // The stored list first — it is what the chat list can render without a
        // round trip — then the server's answer replaces it.
        set({ conversations: await readConversations(account.id), loadingConversations: true })

        try {
          const fetched = await listConversations(account)
          const records = fetched.map((conversation) => ({ ...conversation, accountId: account.id }))
          await saveConversations(records)
          set({ conversations: records, loadingConversations: false, error: null })
        } catch (error) {
          set({ loadingConversations: false, error: describe(error) })
        }
      },

      async openConversation(conversationId) {
        set({ activeConversationId: conversationId, loadingMessages: true, messages: [] })

        try {
          let messages = await getMessages(account.id, conversationId, { limit: MESSAGE_PAGE_SIZE })

          // Saved history lives on the server: this device may never have
          // received those envelopes, so an empty window is filled from there.
          if (messages.length === 0 && isSaved(conversationId, get())) {
            messages = await loadSavedHistory(account)
          }

          set({ messages, loadingMessages: false, error: null })
        } catch (error) {
          set({ loadingMessages: false, error: describe(error) })
        }
      },

      async loadOlderMessages() {
        const { activeConversationId, messages } = get()
        const oldest = messages[messages.length - 1]
        if (activeConversationId === null || oldest === undefined) {
          return
        }

        set({ loadingMessages: true })
        try {
          const older = isSaved(activeConversationId, get())
            ? // The history endpoint pages by server timestamp, which only those
              // envelopes have.
              await loadSavedHistory(account, oldest.serverTimestamp)
            : await getMessages(account.id, activeConversationId, {
                // `until` is inclusive: the boundary second comes back and
                // `mergeById` drops the repeats, so no message is ever skipped.
                until: oldest.clientTimestamp,
                limit: MESSAGE_PAGE_SIZE,
              })

          set({ messages: mergeById(messages, older), loadingMessages: false, error: null })
        } catch (error) {
          set({ loadingMessages: false, error: describe(error) })
        }
      },

      async sendText(plaintext) {
        const { activeConversationId } = get()
        if (activeConversationId === null) {
          throw new Error('[state] no conversation is open')
        }

        set({ sending: true, error: null })
        try {
          const record = await sendToOpenConversation(account, activeConversationId, plaintext, get())
          await saveMessage(record)
          set({ messages: mergeById([record], get().messages), sending: false })
        } catch (error) {
          set({ sending: false, error: describe(error) })
          throw error
        }
      },

      async sendToSaved(plaintext) {
        set({ sending: true, error: null })
        try {
          const result = await sendSavedMessage(account, plaintext)
          set({
            messages:
              get().activeConversationId === result.conversationId
                ? mergeById([result.message], get().messages)
                : get().messages,
            sending: false,
          })
        } catch (error) {
          set({ sending: false, error: describe(error) })
          throw error
        }
      },

      async applyEnvelope(envelope) {
        await applyReceivedEnvelope(envelope, {
          account,
          isConversationOpen: (conversationId) => get().activeConversationId === conversationId,
          updateMessages: (update) => {
            set({ messages: update(get().messages) })
          },
          setIdentityChanges: (changes) => {
            set({ identityChanges: changes })
          },
          setError: (message) => {
            set({ error: message })
          },
          ack: async (envelopeId) => {
            // Acknowledged only after the message is stored: a crash in between
            // costs a redelivery rather than a lost message.
            await requireActiveClient().ackEnvelopes([envelopeId])
          },
        })
      },

      setPresence(event) {
        set({ presence: { ...get().presence, [event.accountId]: event } })
      },

      setTyping(conversationId) {
        set({ typing: { ...get().typing, [conversationId]: nowSeconds() + TYPING_TTL_SECONDS } })
      },

      async acknowledgeIdentityChanges() {
        // Only the user can judge a changed identity key, so the journal is
        // cleared here and nowhere else.
        await clearIdentityChanges(account.id)
        set({ identityChanges: [] })
      },

      reset() {
        set({ ...initialState })
      },
    },
  }))
}

function isSaved(conversationId: string, state: AccountStore): boolean {
  return state.conversations.find((entry) => entry.id === conversationId)?.kind === 'saved'
}

async function sendToOpenConversation(
  account: Account,
  conversationId: string,
  plaintext: string,
  state: AccountStore,
): Promise<MessageRecord> {
  const conversation = state.conversations.find((entry) => entry.id === conversationId)

  if (conversation?.kind === 'saved') {
    return (await sendSavedMessage(account, plaintext, conversationId)).message
  }

  if (conversation?.kind === 'group') {
    const result = await sendGroupMessage(account, conversationId, plaintext)
    return buildLocalMessageRecord(account, conversationId, plaintext, result.envelopeIds[0])
  }

  if (conversation !== undefined && conversation.kind !== 'direct') {
    throw new Error(`[state] sending to a ${conversation.kind} is a server-side action, not an envelope`)
  }

  const peerAccountId = await resolveDirectPeer(account, conversationId)
  const result = await sendDirectMessage(account, { conversationId, peerAccountId }, plaintext)
  return buildLocalMessageRecord(account, conversationId, plaintext, result.envelopeIds[0])
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
