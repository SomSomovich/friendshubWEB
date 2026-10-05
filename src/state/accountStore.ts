import { createStore, type StoreApi } from 'zustand/vanilla'
import { listConversations } from '../api/conversations'
import {
  buildLocalMessageRecord,
  resolveDirectPeer,
  sendGroupMessage,
  sendMessage as sendDirectMessage,
  sendToSaved as sendSavedMessage,
  type MessageDraft,
  type SendOptions,
} from '../crypto/send'
import { SAVED_PAGE_SIZE, loadSavedHistory } from '../crypto/saved'
import { saveAccount } from '../storage/accounts'
import { listConversations as readConversations, saveConversations } from '../storage/conversations'
import type { ConversationRecord, MessageRecord } from '../storage/db'
import { loadHistoryCursors } from '../storage/read_state'
import {
  deleteMessage,
  getMessages,
  saveMessage,
  updateMessage,
  updateServerTimestamp,
} from '../storage/messages'
import type { BotMessage } from '../api/bots'
import type { Account, Envelope } from '../types'
import { nowSeconds } from '../utils/time'
import { uuidV7 } from '../utils/uuid'
import { getActiveClientOrNull, requireActiveClient } from '../ws/activeClient'
import { clearIdentityChanges, type IdentityChange } from '../wasm'
import type { PresenceEvent } from '../ws/events'
import { TYPING_TTL_SECONDS, withTyping, type TypingState } from '../utils/typing'
import { applyReceivedEnvelope, mergeById } from './applyEnvelope'
import { enqueue, listOutbox, removeFromOutbox } from './outbox'
import { useUiStore } from './uiStore'

/**
 * Everything one account knows: its conversation list, the open message window,
 * presence, typing indicators and the send/receive actions.
 *
 * One store per account, created on demand and never shared — the point of the
 * multi-account model (brief §8) is that accounts cannot see each other. The
 * store holds no React state and touches no DOM, so it also runs in Node.
 */

const MESSAGE_PAGE_SIZE = 50

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
  /**
   * Conversation id → account id → unix seconds until which that account is
   * typing. Per account rather than per conversation because a group can have
   * several people typing at once, and the header says something different when
   * it does.
   */
  typing: TypingState
  /**
   * Conversation id → account id → the newest `server_timestamp` that account
   * has read up to. Server state, mirrored here so a tick redraws from one
   * source rather than from whatever the last request happened to return.
   */
  readMarkers: Record<string, Record<string, number>>
  /**
   * Bot threads, newest last. A bot is not a conversation — it has no members,
   * no envelopes and no conversation id — so its history is kept apart, keyed by
   * the bot it belongs to.
   */
  botThreads: Record<string, BotMessage[]>
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
  /**
   * Sends a whole draft — text, replies, attachments.
   *
   * `sendText` is the one-field shorthand for it. Nothing here queues: an
   * attachment has to be uploaded first, which needs a connection by definition.
   */
  sendDraft: (draft: MessageDraft) => Promise<void>
  sendToSaved: (plaintext: string) => Promise<void>
  /** Sends whatever was queued while the connection was down. */
  flushOutbox: () => Promise<void>
  applyEnvelope: (envelope: Envelope) => Promise<void>
  /** Records the server's stamp for envelopes this device uploaded. */
  applyReceipt: (envelopeIds: string[], serverTimestamps: number[]) => Promise<void>
  setPresence: (event: PresenceEvent) => void
  /** Records that `accountId` is typing in a conversation, for a few seconds. */
  setTyping: (conversationId: string, accountId: string) => void
  /** Moves one account's read marker, from a live frame or from the endpoint. */
  setReadMarker: (conversationId: string, accountId: string, lastReadAt: number) => void
  /** Replaces a conversation's markers wholesale, from `GET /reads`. */
  applyReadMarkers: (conversationId: string, markers: Record<string, number>) => void
  /** Replaces a bot thread with its history. */
  setBotThread: (botId: string, messages: BotMessage[]) => void
  /** Adds one message to a bot thread, keeping the order by creation time. */
  appendBotMessage: (botId: string, message: BotMessage) => void
  /** Applies a local change to one message in the open window and in storage. */
  patchMessage: (envelopeId: string, patch: Partial<MessageRecord>) => Promise<void>
  /** Drops one message from the open window and from storage. */
  removeMessage: (envelopeId: string) => Promise<void>
  /** Empties the open window for a conversation whose local history was wiped. */
  dropConversationMessages: (conversationId: string) => void
  /** Persists a change to the account's own record, e.g. a new username. */
  updateAccount: (patch: Partial<Account>) => Promise<void>
  acknowledgeIdentityChanges: () => Promise<void>
  reset: () => void
}

export type AccountStore = AccountStoreState & { actions: AccountActions }


export function createAccountStore(account: Account): StoreApi<AccountStore> {
  const initialState: AccountStoreState = {
    accountId: account.id,
    account,
    conversations: [],
    messages: [],
    activeConversationId: null,
    presence: {},
    typing: {},
    readMarkers: {},
    botThreads: {},
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

      async sendDraft(draft) {
        const { activeConversationId } = get()
        if (activeConversationId === null) {
          throw new Error('[state] no conversation is open')
        }

        set({ sending: true, error: null })
        try {
          const record = await sendToOpenConversation(account, activeConversationId, draft, get())
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

      async sendText(plaintext) {
        const { activeConversationId } = get()
        if (activeConversationId === null) {
          throw new Error('[state] no conversation is open')
        }

        // No socket to send over: the message is written locally and queued, so
        // what the reader typed is never lost to a tunnel. It gets both of its
        // identifiers now, and keeps them when it is finally sent — the queue is
        // keyed by the same ids the flusher will use.
        if (getActiveClientOrNull()?.isConnected !== true) {
          const messageId = uuidV7()
          const createdAt = nowSeconds()
          const placeholder = buildLocalMessageRecord(account, {
            conversationId: activeConversationId,
            messageId,
            envelopeId: uuidV7(),
            draft: { text: plaintext },
            createdAt,
            status: 'sending',
          })

          await saveMessage(placeholder)
          await enqueue(account.id, {
            id: placeholder.envelopeId,
            conversationId: activeConversationId,
            plaintext,
            createdAt,
          })
          set({
            messages: mergeById([placeholder], get().messages),
            sending: false,
            messagesVersion: get().messagesVersion + 1,
          })
          return
        }

        set({ sending: true, error: null })
        try {
          const record = await sendToOpenConversation(account, activeConversationId, { text: plaintext }, get())
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

      /**
       * Sends whatever was written while the connection was down.
       *
       * Stops at the first failure rather than trying the rest: the failures here
       * are almost always "still not connected", and hammering a socket that is
       * not there would only bury the one useful error. Whatever is left stays
       * queued for the next attempt.
       */
      async flushOutbox() {
        const queue = await listOutbox(account.id)
        if (queue.length === 0) {
          return
        }

        for (const item of queue) {
          try {
            const record = await sendToOpenConversation(
              account,
              item.conversationId,
              { text: item.plaintext },
              get(),
              { createdAt: item.createdAt },
            )
            // The placeholder goes first: the real record has its own envelope
            // id, and both at once would be the message twice.
            await deleteMessage(account.id, item.id)
            await saveMessage(record)
            await removeFromOutbox(account.id, item.id)

            if (get().activeConversationId === item.conversationId) {
              set({
                messages: mergeById(
                  get().messages.filter((message) => message.envelopeId !== item.id),
                  [record],
                ),
              })
            }
          } catch (error) {
            console.warn('[outbox] a queued message could not be sent yet', error)
            break
          }
        }

        set({ messagesVersion: get().messagesVersion + 1 })
      },

      async sendToSaved(plaintext) {
        set({ sending: true, error: null })
        try {
          const result = await sendSavedMessage(account, { text: plaintext })
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

      async applyReceipt(envelopeIds, serverTimestamps) {
        // Only the envelopes this device uploaded are known here; the rest of a
        // batch belongs to devices it will never see. One of them is enough —
        // every envelope of one upload carries the same stamp.
        const stamped = new Map<string, number>()
        for (const [index, envelopeId] of envelopeIds.entries()) {
          const stamp = serverTimestamps[index]
          if (stamp !== undefined && stamp > 0) {
            stamped.set(envelopeId, stamp)
          }
        }

        const changed: Array<{ envelopeId: string; serverTimestamp: number }> = []
        for (const [envelopeId, serverTimestamp] of stamped) {
          if (await updateServerTimestamp(account.id, envelopeId, serverTimestamp)) {
            changed.push({ envelopeId, serverTimestamp })
          }
        }
        if (changed.length === 0) {
          return
        }

        const byEnvelope = new Map(changed.map((entry) => [entry.envelopeId, entry.serverTimestamp]))
        set({
          messages: get().messages.map((message) => {
            const serverTimestamp = byEnvelope.get(message.envelopeId)
            return serverTimestamp === undefined ? message : { ...message, serverTimestamp }
          }),
        })
      },

      setPresence(event) {
        set({ presence: { ...get().presence, [event.accountId]: event } })
      },

      setTyping(conversationId, accountId) {
        set({
          typing: withTyping(get().typing, conversationId, accountId, nowSeconds() + TYPING_TTL_SECONDS),
        })
      },

      setReadMarker(conversationId, accountId, lastReadAt) {
        const current = get().readMarkers[conversationId] ?? {}
        // Markers only ever move forward: a stale frame from a reconnect must not
        // un-read what a newer one already announced.
        if ((current[accountId] ?? 0) >= lastReadAt) {
          return
        }
        set({
          readMarkers: {
            ...get().readMarkers,
            [conversationId]: { ...current, [accountId]: lastReadAt },
          },
        })
      },

      applyReadMarkers(conversationId, markers) {
        set({ readMarkers: { ...get().readMarkers, [conversationId]: markers } })
      },

      setBotThread(botId, messages) {
        set({ botThreads: { ...get().botThreads, [botId]: messages } })
      },

      appendBotMessage(botId, message) {
        const thread = get().botThreads[botId] ?? []
        // A message the socket announced can also be in the page that was just
        // fetched; the id is what keeps the thread from showing it twice.
        if (thread.some((entry) => entry.id === message.id)) {
          return
        }
        set({
          botThreads: {
            ...get().botThreads,
            [botId]: [...thread, message].sort((left, right) => left.createdAt - right.createdAt),
          },
        })
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

      async updateAccount(patch) {
        const next = { ...get().account, ...patch }
        await saveAccount(next)
        set({ account: next })
        // The account is read with `getState()` rather than subscribed to, so
        // every screen that shows it — the sidebar, the chat list rows, the
        // profile — has to be told. The UI store owns that signal.
        useUiStore.getState().bumpAccountRevision()
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

/**
 * Sends a draft to whichever kind of conversation is open.
 *
 * The send helpers build the local row themselves, so the caller never
 * re-assembles one: the identifiers in it have to be the ones that actually went
 * out, and a second construction site is a second chance to get that wrong.
 */
async function sendToOpenConversation(
  account: Account,
  conversationId: string,
  draft: MessageDraft,
  state: AccountStore,
  options: SendOptions = {},
): Promise<MessageRecord> {
  const conversation = state.conversations.find((entry) => entry.id === conversationId)

  if (conversation?.kind === 'saved') {
    return (await sendSavedMessage(account, draft, conversationId, options)).message
  }

  if (conversation?.kind === 'group') {
    return (await sendGroupMessage(account, conversationId, draft, options)).message
  }

  if (conversation !== undefined && conversation.kind !== 'direct') {
    throw new Error(`[state] sending to a ${conversation.kind} is a server-side action, not an envelope`)
  }

  const peerAccountId = await resolveDirectPeer(account, conversationId)
  return (await sendDirectMessage(account, { conversationId, peerAccountId }, draft, options)).message
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
