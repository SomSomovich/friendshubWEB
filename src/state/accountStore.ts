import { createStore, type StoreApi } from 'zustand/vanilla'
import { listConversations } from '../api/conversations'
import {
  buildLocalMessageRecord,
  resolveDirectPeer,
  sendGroupMessage,
  sendMessage as sendDirectMessage,
  sendToSaved as sendSavedMessage,
} from '../crypto/send'
import { SAVED_PAGE_SIZE, loadSavedHistory } from '../crypto/saved'
import { listConversations as readConversations, saveConversations } from '../storage/conversations'
import type { ConversationRecord, MessageRecord } from '../storage/db'
import { loadHistoryCursors } from '../storage/read_state'
import {
  deleteMessage,
  getMessages,
  markDelivered,
  saveMessage,
  updateMessage,
} from '../storage/messages'
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
  /**
   * The full record, token included: screens need the avatar, the FH number and
   * the session for API calls, and reaching for IndexedDB on every render would
   * be worse than keeping it here.
   */
  account: Account
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
  /**
   * Bumped whenever a message is written — received or sent — including for
   * conversations that are not open: the chat list watches it to refresh rows
   * and their order.
   */
  messagesVersion: number
  loadingConversations: boolean
  loadingMessages: boolean
  /**
   * True while older messages may still exist behind the open window — the
   * transcript uses it to decide whether scrolling up should ask for more.
   */
  hasOlder: boolean
  sending: boolean
  error: string | null
}

export type AccountActions = {
  loadConversations: () => Promise<void>
  openConversation: (conversationId: string) => Promise<void>
  /** Stops treating a conversation as open, so late envelopes do not touch it. */
  closeConversation: (conversationId: string) => void
  loadOlderMessages: () => Promise<void>
  sendText: (plaintext: string) => Promise<void>
  sendToSaved: (plaintext: string) => Promise<void>
  applyEnvelope: (envelope: Envelope) => Promise<void>
  /** Records that the server stored these envelopes (`'sent'` → `'delivered'`). */
  applyReceipt: (envelopeIds: string[]) => Promise<void>
  setPresence: (event: PresenceEvent) => void
  setTyping: (conversationId: string) => void
  /** Applies a local change to one message in the open window and in storage. */
  patchMessage: (envelopeId: string, patch: Partial<MessageRecord>) => Promise<void>
  /** Drops one message from the open window and from storage. */
  removeMessage: (envelopeId: string) => Promise<void>
  /** Empties the open window for a conversation whose local history was wiped. */
  dropConversationMessages: (conversationId: string) => void
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
    account,
    conversations: [],
    messages: [],
    activeConversationId: null,
    presence: {},
    typing: {},
    identityChanges: [],
    messagesVersion: 0,
    loadingConversations: false,
    loadingMessages: false,
    hasOlder: false,
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
        set({
          activeConversationId: conversationId,
          loadingMessages: true,
          messages: [],
          hasOlder: false,
        })

        try {
          let messages = await getMessages(account.id, conversationId, { limit: MESSAGE_PAGE_SIZE })
          let hasOlder = messages.length >= MESSAGE_PAGE_SIZE

          // Saved history lives on the server: this device may never have
          // received those envelopes, so an empty window is filled from there —
          // and, when its history was cleared locally, only from before the
          // point it was cleared at.
          if (messages.length === 0 && isSaved(conversationId, get())) {
            const cursors = await loadHistoryCursors(account.id)
            messages = await loadSavedHistory(account, cursors[conversationId])
            hasOlder = messages.length >= SAVED_PAGE_SIZE
          }

          // The window may have moved on while the read was in flight (the user
          // opened another conversation, or went back to the list).
          if (get().activeConversationId !== conversationId) {
            return
          }
          set({ messages, hasOlder, loadingMessages: false, error: null })
        } catch (error) {
          set({ loadingMessages: false, error: describe(error) })
        }
      },

      closeConversation(conversationId) {
        if (get().activeConversationId !== conversationId) {
          return
        }
        set({ activeConversationId: null, messages: [], loadingMessages: false })
      },

      async loadOlderMessages() {
        const { activeConversationId, messages } = get()
        const oldest = messages[messages.length - 1]
        if (activeConversationId === null || oldest === undefined) {
          return
        }

        set({ loadingMessages: true })
        try {
          const fromSaved = isSaved(activeConversationId, get())
          const older = fromSaved
            ? // The history endpoint pages by server timestamp, which only those
              // envelopes have.
              await loadSavedHistory(account, oldest.serverTimestamp)
            : await getMessages(account.id, activeConversationId, {
                // `until` is inclusive: the boundary second comes back and
                // `mergeById` drops the repeats, so no message is ever skipped.
                until: oldest.clientTimestamp,
                limit: MESSAGE_PAGE_SIZE,
              })

          if (get().activeConversationId !== activeConversationId) {
            return
          }
          set({
            messages: mergeById(messages, older),
            // A short page is the end of the history; an empty one means the
            // caller asked once too often, which is the normal way this stops.
            hasOlder: older.length >= (fromSaved ? SAVED_PAGE_SIZE : MESSAGE_PAGE_SIZE),
            loadingMessages: false,
            error: null,
          })
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
          set({
            messages: mergeById([record], get().messages),
            sending: false,
            messagesVersion: get().messagesVersion + 1,
          })
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
            messagesVersion: get().messagesVersion + 1,
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
          onMessageStored: () => {
            set({ messagesVersion: get().messagesVersion + 1 })
          },
          ack: async (envelopeId) => {
            // Acknowledged only after the message is stored: a crash in between
            // costs a redelivery rather than a lost message.
            await requireActiveClient().ackEnvelopes([envelopeId])
          },
        })
      },

      async applyReceipt(envelopeIds) {
        const changed = await markDelivered(account.id, envelopeIds)
        if (changed.length === 0) {
          return
        }
        const delivered = new Set(changed)
        set({
          messages: get().messages.map((message) =>
            delivered.has(message.envelopeId) ? { ...message, status: 'delivered' } : message,
          ),
        })
      },

      setPresence(event) {
        set({ presence: { ...get().presence, [event.accountId]: event } })
      },

      setTyping(conversationId) {
        set({ typing: { ...get().typing, [conversationId]: nowSeconds() + TYPING_TTL_SECONDS } })
      },

      async patchMessage(envelopeId, patch) {
        await updateMessage(account.id, envelopeId, patch)
        set({
          messages: get().messages.map((message) =>
            message.envelopeId === envelopeId ? { ...message, ...patch } : message,
          ),
          // An edit changes the text a chat row previews, so the list has to
          // re-read it just as it does for a new message.
          messagesVersion: get().messagesVersion + 1,
        })
      },

      async removeMessage(envelopeId) {
        await deleteMessage(account.id, envelopeId)
        set({
          messages: get().messages.filter((message) => message.envelopeId !== envelopeId),
          messagesVersion: get().messagesVersion + 1,
        })
      },

      dropConversationMessages(conversationId) {
        if (get().activeConversationId !== conversationId) {
          return
        }
        set({ messages: [], messagesVersion: get().messagesVersion + 1 })
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
    return buildLocalMessageRecord(
      account,
      conversationId,
      plaintext,
      result.envelopeIds[0],
      devicesByAccount(result.envelopes),
    )
  }

  if (conversation !== undefined && conversation.kind !== 'direct') {
    throw new Error(`[state] sending to a ${conversation.kind} is a server-side action, not an envelope`)
  }

  const peerAccountId = await resolveDirectPeer(account, conversationId)
  const result = await sendDirectMessage(account, { conversationId, peerAccountId }, plaintext)
  return buildLocalMessageRecord(
    account,
    conversationId,
    plaintext,
    result.envelopeIds[0],
    devicesByAccount(result.envelopes),
  )
}

/** Maps each recipient device to the envelope it received. */
function devicesByAccount(envelopes: Envelope[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const envelope of envelopes) {
    map[`${envelope.recipientAccountId}:${envelope.recipientDeviceNumber}`] = envelope.envelopeId
  }
  return map
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
