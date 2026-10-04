import type { StoreApi } from 'zustand/vanilla'
import type { Account } from '../types'
import type { WsClient } from '../ws/client'
import { requireAccountStore } from './accountRegistry'
import type { AccountStore } from './accountStore'

/**
 * Wires one WebSocket to one account's store.
 *
 * The connection layer knows nothing about accounts, and the store knows nothing
 * about sockets; this is the only place where the two meet. It exists because
 * nothing else can own it: the crypto state is per account, so envelopes must be
 * applied in the order they arrive, and a receipt only means something once the
 * store that holds the message has seen it.
 */

export function attachClientToAccount(client: WsClient, account: Account): () => void {
  const store = requireAccountStore(account.id)

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
        })
        .catch((error: unknown) => {
          console.error('[state] an envelope could not be applied', error)
        })
    }
  })

  const detachReceipt = client.on('receipt', ({ envelopeIds }) => {
    void store
      .getState()
      .actions.applyReceipt(envelopeIds)
      .catch((error: unknown) => {
        console.error('[state] a receipt could not be applied', error)
      })
  })

  const detachPresence = client.on('presence', (event) => {
    store.getState().actions.setPresence(event)
  })

  return () => {
    detachDelivery()
    detachReceipt()
    detachPresence()
  }
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
