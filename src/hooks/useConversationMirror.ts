import { useCallback, useEffect, useState } from 'react'
import {
  readConversationMirror,
  writeConversationMirror,
  type ConversationMirror,
} from '../storage/app_settings'

/**
 * The group/channel settings this device has set, read once per screen.
 *
 * The three values are write-only on the server — see `ConversationMirror` — so
 * the screen reads them from IndexedDB and writes each change back through here
 * as well as to the API. The value is tagged with the conversation it belongs
 * to, so two conversations cannot be shown each other's.
 */

export type ConversationMirrorState = {
  /** `null` until the first read settles. */
  mirror: ConversationMirror | null
  update: (patch: Partial<ConversationMirror>) => Promise<void>
}

type Loaded = {
  conversationId: string
  mirror: ConversationMirror
}

export function useConversationMirror(
  accountId: string,
  conversationId: string,
): ConversationMirrorState {
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    let cancelled = false
    void readConversationMirror(accountId, conversationId).then((mirror) => {
      if (!cancelled) {
        setLoaded({ conversationId, mirror })
      }
    })
    return () => {
      cancelled = true
    }
  }, [accountId, conversationId])

  const update = useCallback(
    async (patch: Partial<ConversationMirror>) => {
      const mirror = await writeConversationMirror(accountId, conversationId, patch)
      setLoaded({ conversationId, mirror })
    },
    [accountId, conversationId],
  )

  return {
    mirror: loaded !== null && loaded.conversationId === conversationId ? loaded.mirror : null,
    update,
  }
}
