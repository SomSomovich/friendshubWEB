import { useEffect } from 'react'
import { getConversationReads, markConversationRead } from '../api/conversations'
import { requireAccountStore } from '../state/accountRegistry'
import type { Account } from '../types'

/**
 * Reporting that this device has read a conversation, and reading back what
 * everyone else has.
 *
 * The marker is sent without an `upTo`: a received message carries only the
 * sender's clock, and a read marker is compared against *server* timestamps, so
 * guessing one from a live frame would be worse than letting the server use its
 * own now. The debounce is what keeps a burst of messages from becoming a
 * request each.
 */

const READ_DEBOUNCE_MS = 1_500

export function useReadReceipts(
  account: Account,
  conversationId: string,
  /** The newest incoming message's timestamp; a change is what re-arms the debounce. */
  newestIncomingAt: number | null,
): void {
  const store = requireAccountStore(account.id)

  // What everyone else has read, which is what the ticks are drawn from.
  useEffect(() => {
    let cancelled = false
    void getConversationReads(account, conversationId)
      .then((reads) => {
        if (!cancelled) {
          store.getState().actions.applyReadMarkers(
            conversationId,
            Object.fromEntries(reads.map((entry) => [entry.accountId, entry.lastReadAt])),
          )
        }
      })
      .catch((error: unknown) => {
        // Nothing to read is the state a conversation nobody has opened is in,
        // and the live frames will fill it in.
        console.warn('[read] the read markers could not be read', error)
      })

    return () => {
      cancelled = true
    }
  }, [account, conversationId, store])

  /**
   * This device's own read marker, moved the moment a message is seen.
   *
   * It is the marker the chat list counts a row's badge against, so it has to
   * move when the message is *read*, not when the server is told — a row that
   * keeps its badge for the conversation open on screen is showing something
   * untrue, and anything that arrives while the reader is looking has been read
   * by any reasonable definition.
   *
   * Separate from the report below, which is debounced because it is a request.
   */
  useEffect(() => {
    if (newestIncomingAt === null || document.visibilityState !== 'visible') {
      return
    }
    void store.getState().actions.markRead(conversationId)
  }, [store, conversationId, newestIncomingAt])

  useEffect(() => {
    if (newestIncomingAt === null || document.visibilityState !== 'visible') {
      return
    }

    let cancelled = false
    const timer = setTimeout(() => {
      void markConversationRead(account, conversationId).catch((error: unknown) => {
        if (!cancelled) {
          console.warn('[read] the read marker could not be reported', error)
        }
      })
    }, READ_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [account, conversationId, newestIncomingAt])

  // Leaving the tab is the last honest moment to say "read up to here": after
  // it, nothing will run until the reader comes back.
  useEffect(() => {
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        void markConversationRead(account, conversationId).catch((error: unknown) => {
          console.warn('[read] the read marker could not be reported', error)
        })
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [account, conversationId])
}
