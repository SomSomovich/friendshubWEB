import type { StoreApi } from 'zustand/vanilla'
import { getConversationReads } from '../api/conversations'
import { isDeadSessionCode, reportSessionExpired } from '../auth/sessionExpiry'
import { ensurePrekeysUploaded } from '../crypto/account'
import { i18n } from '../i18n'
import { announceIncoming } from '../pwa/notify'
import { useToastStore, type ToastKind } from './toastStore'
import { getMessage } from '../storage/messages'
import type { Account, Envelope } from '../types'
import type { WsClient } from '../ws/client'
import { ENVELOPE_TYPE_MESSAGE } from '../ws/envelopeTypes'
import { requireAccountStore } from './accountRegistry'
import type { AccountStore } from './accountStore'
import { refreshPins } from './pins'

/**
 * Wires one WebSocket to one account's store.
 *
 * The connection layer knows nothing about accounts, and the store knows nothing
 * about sockets; this is the only place where the two meet. It exists because
 * nothing else can own it: the crypto state is per account, so envelopes must be
 * applied in the order they arrive, and a receipt only means something once the
 * store that holds the message has seen it.
 */

/**
 * How often a signed-in device re-checks that it can still be reached.
 *
 * The prekey pool is spent by other people's traffic, so it drains while nothing
 * on this device happens at all. Connecting is one moment to top it up — and the
 * only one, until this: a tab left open for days never reconnects, so it would
 * otherwise become silently unreachable exactly as a device that had just
 * signed in once used to.
 */
const PREKEY_RECHECK_MS = 15 * 60_000

export function attachClientToAccount(client: WsClient, account: Account): () => void {
  const store = requireAccountStore(account.id)

  const replenishPrekeys = (): void => {
    void ensurePrekeysUploaded(account).catch((error: unknown) => {
      console.warn('[state] the prekey pool could not be topped up', error)
    })
  }
  const prekeyTimer = setInterval(replenishPrekeys, PREKEY_RECHECK_MS)

  // Decryption mutates the module's state, so envelopes are applied one at a
  // time. Firing them off concurrently would let two calls interleave inside the
  // WASM module, which has no lock of its own.
  let chain: Promise<void> = Promise.resolve()

  const detachDelivery = client.on('delivery', ({ envelopes }) => {
    for (const envelope of envelopes) {
      chain = chain
        .then(async () => {
          await store.getState().actions.applyEnvelope(envelope)
          requestConversationIfUnknown(store, account.id, envelope.conversationId)
          await announceMessage(store, account, envelope)
        })
        .catch((error: unknown) => {
          console.error('[state] an envelope could not be applied', error)
        })
    }
  })

  const detachReceipt = client.on('receipt', ({ envelopeIds, serverTimestamps }) => {
    void store
      .getState()
      .actions.applyReceipt(envelopeIds, serverTimestamps)
      .catch((error: unknown) => {
        console.error('[state] a receipt could not be applied', error)
      })
  })

  const detachPresence = client.on('presence', (event) => {
    store.getState().actions.setPresence(event)
  })

  const detachTyping = client.on('typing', ({ conversationId, accountId }) => {
    store.getState().actions.setTyping(conversationId, accountId)
  })

  const detachReadReceipt = client.on('readReceipt', ({ conversationId, accountId, lastReadAt }) => {
    store.getState().actions.setReadMarker(conversationId, accountId, lastReadAt)
  })

  // A bot's reply is its own frame rather than an envelope, so it arrives here
  // rather than through the decryption path.
  const detachBotMessage = client.on('botMessage', (event) => {
    store.getState().actions.appendBotMessage(event.botId, {
      id: event.messageId,
      botId: event.botId,
      senderAccountId: account.id,
      direction: 'from_bot',
      text: event.text,
      replyToId: event.replyToMessageId,
      createdAt: event.createdAt,
    })
  })

  const detachFatal = client.on('fatal', ({ code }) => {
    // The one fatal case worth acting on: a session that will never work again.
    // Everything else — a protocol mismatch, a flood — is a broken connection,
    // and the socket's own reconnect loop is the right answer to it.
    if (isDeadSessionCode(code)) {
      void reportSessionExpired(account)
    }
  })

  /**
   * Whether this socket has ever completed a handshake.
   *
   * The distinction is what makes the two notices honest: a first connection
   * that never came up is already reported by the offline banner, and calling it
   * "restored" afterwards would be a lie about a connection that never existed.
   */
  let hasConnected = false
  const detachDisconnected = client.on('disconnected', ({ final }) => {
    // A deliberate close is a sign-out or an account switch, not a failure.
    if (final) {
      return
    }
    pushToast('error', i18n.t('app.connectionLost'))
  })

  // A connection is the moment the queue from the last disconnection can go out,
  // and one of the two moments a conversation's pins can have changed without
  // this device noticing. The other is opening the conversation.
  const detachConnected = client.on('connected', () => {
    if (hasConnected) {
      pushToast('success', i18n.t('app.connectionRestored'))
    }
    hasConnected = true

    // Being connected is the moment to make sure other people can still reach
    // *this* device. The one-time prekey pool is what they draw on to open a
    // session, it is consumed by their traffic rather than by anything this
    // client does, and until this ran it was only ever refilled by signing in —
    // so a device that stayed signed in drained to nothing and everybody
    // writing to it was told it had no prekeys left.
    replenishPrekeys()

    void store
      .getState()
      .actions.flushOutbox()
      .catch((error: unknown) => {
        console.error('[state] the outbox could not be flushed', error)
      })

    const open = store.getState().activeConversationId
    if (open !== null) {
      void refreshPins(account, open).catch((error: unknown) => {
        console.warn('[state] the pins could not be refreshed', error)
      })
      // Read markers too: while this device was away somebody may have read the
      // whole conversation, and the ticks would stay grey until it is reopened.
      void getConversationReads(account, open)
        .then((reads) => {
          store.getState().actions.applyReadMarkers(
            open,
            Object.fromEntries(reads.map((entry) => [entry.accountId, entry.lastReadAt])),
          )
        })
        .catch((error: unknown) => {
          console.warn('[state] the read markers could not be refreshed', error)
        })
    }
  })

  return () => {
    clearInterval(prekeyTimer)
    detachDelivery()
    detachReceipt()
    detachPresence()
    detachTyping()
    detachReadReceipt()
    detachBotMessage()
    detachConnected()
    detachDisconnected()
    detachFatal()
  }
}

/** A toast raised from the socket layer; see `src/state/toastStore.ts`. */
function pushToast(kind: ToastKind, message: string): void {
  useToastStore.getState().push({ kind, message })
}

/**
 * Announces a message from somebody else that is not already on screen.
 *
 * Skipped for the open conversation: the reader is looking at it, and a system
 * banner for a message already visible is noise. Sync copies are skipped too —
 * they are this account's own messages coming back from another device.
 */
async function announceMessage(
  store: StoreApi<AccountStore>,
  account: Account,
  envelope: Envelope,
): Promise<void> {
  if (
    envelope.envelopeType !== ENVELOPE_TYPE_MESSAGE ||
    envelope.senderAccountId === account.id ||
    envelope.conversationId === null ||
    store.getState().activeConversationId === envelope.conversationId
  ) {
    return
  }

  const conversation = store
    .getState()
    .conversations.find((entry) => entry.id === envelope.conversationId)
  if (conversation === undefined) {
    return
  }

  // Read back from storage rather than from the open window: the window holds
  // one conversation, and the whole point here is the ones that are not open.
  const message = await getMessage(account.id, envelope.envelopeId)

  await announceIncoming({
    accountId: account.id,
    title: conversation.title ?? account.username,
    body: message?.plaintext ?? '',
    muted: conversation.mutedUntil !== null,
  })
}

/**
 * Conversations already asked for during this connection.
 *
 * A message from somebody the account has never talked to arrives before its
 * conversation does — the server sends the envelope, not the list. One extra
 * sync per unknown conversation is enough; a per-connection memo keeps a burst
 * of ten messages from becoming ten requests.
 */
const requested = new Set<string>()

function requestConversationIfUnknown(
  store: StoreApi<AccountStore>,
  accountId: string,
  conversationId: string | null,
): void {
  if (conversationId === null) {
    return
  }
  if (store.getState().conversations.some((entry) => entry.id === conversationId)) {
    return
  }

  const key = `${accountId}:${conversationId}`
  if (requested.has(key)) {
    return
  }
  requested.add(key)

  void store
    .getState()
    .actions.loadConversations()
    .catch((error: unknown) => {
      console.warn('[state] could not refresh the conversation list', error)
    })
}
