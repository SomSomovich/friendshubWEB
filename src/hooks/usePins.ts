import { useCallback, useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { requireAccountStore } from '../state/accountRegistry'
import type { MessageRecord } from '../storage/db'
import { getMessageByMessageId } from '../storage/messages'
import { listPinned } from '../storage/pinned'
import { loadPinnedBannerHidden, setPinnedBannerHidden } from '../storage/read_state'
import type { Account } from '../types'

/**
 * The pinned messages of one conversation, and whether the banner is showing.
 *
 * Pins are their own store rather than a flag on the message window: a pin made
 * last week would fall out of the loaded page and vanish from the banner, which
 * is the one thing the banner exists to prevent. The message behind each pin is
 * read back individually, and a pin whose message is gone is dropped.
 */

export type PinnedMessages = {
  pins: MessageRecord[]
  /** Which pin the banner is showing. */
  index: number
  setIndex: (index: number) => void
  /** True once the user closed the banner in this conversation. */
  hidden: boolean
  hide: () => void
}

export function usePins(account: Account, conversationId: string): PinnedMessages {
  const store = requireAccountStore(account.id)
  // Republished whenever a message is written, which is also when a pin can
  // appear or disappear.
  const messagesVersion = useStore(store, (state) => state.messagesVersion)

  const [pins, setPins] = useState<MessageRecord[]>([])
  const [index, setIndex] = useState(0)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const [records, preferences] = await Promise.all([
        listPinned(account.id, conversationId),
        loadPinnedBannerHidden(account.id),
      ])
      const messages = await Promise.all(
        records.map((record) => getMessageByMessageId(account.id, conversationId, record.messageId)),
      )

      if (cancelled) {
        return
      }
      setPins(messages.filter((message): message is MessageRecord => message !== null))
      setHidden(preferences[conversationId] !== undefined)
    })()

    return () => {
      cancelled = true
    }
  }, [account.id, conversationId, messagesVersion])

  const hide = useCallback(() => {
    setHidden(true)
    setIndex(0)
    void setPinnedBannerHidden(account.id, conversationId, true).catch((error: unknown) => {
      console.warn('[chat] the banner preference could not be saved', error)
    })
  }, [account.id, conversationId])

  // A banner pointing past the end of a shorter list would render nothing at all.
  const safeIndex = pins.length === 0 ? 0 : Math.min(index, pins.length - 1)

  return { pins, index: safeIndex, setIndex, hidden, hide }
}
