import { useCallback, useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { requireAccountStore } from '../state/accountRegistry'
import type { MessageRecord } from '../storage/db'
import { searchMessages } from '../storage/messages'
import type { Account } from '../types'

/**
 * In-chat search.
 *
 * Local by necessity: the server holds ciphertext and has no search endpoint, so
 * the only text that can be matched is what this device has decrypted. The
 * debounce is what keeps a fast typist from running a full scan per keystroke.
 */

const DEBOUNCE_MS = 300
/** Beyond this many hits, paging through them stops being useful. */
const MAX_RESULTS = 100

export type ChatSearch = {
  query: string
  setQuery: (value: string) => void
  results: MessageRecord[]
  searching: boolean
  /** The result the reader is on, or `-1` when there are none. */
  index: number
  /** The result on screen, if any. */
  current: MessageRecord | null
  select: (index: number) => void
  next: () => void
  previous: () => void
}

/** A finished search, tagged with the text it was run for. */
type SearchResult = {
  needle: string
  results: MessageRecord[]
  index: number
}

const NO_RESULT: SearchResult = { needle: '', results: [], index: -1 }

export function useChatSearch(
  account: Account,
  conversationId: string,
  active: boolean,
): ChatSearch {
  const store = requireAccountStore(account.id)
  // The window can change under the search — a new message, an edit, a delete —
  // and stale hits would point at text that is no longer there.
  const messagesVersion = useStore(store, (state) => state.messagesVersion)

  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchResult>(NO_RESULT)

  const needle = query.trim()
  // The stored answer belongs to the text it was searched for. Anything else is
  // still being looked up, which is also what `searching` means — so neither
  // needs its own piece of state, and a cleared query can never show old hits.
  const settled = state.needle === needle ? state : NO_RESULT
  const searching = needle.length > 0 && state.needle !== needle

  useEffect(() => {
    if (!active || needle.length === 0) {
      return
    }

    let cancelled = false
    const timer = setTimeout(() => {
      void searchMessages(account.id, conversationId, needle, MAX_RESULTS)
        .then((results) => {
          if (!cancelled) {
            setState({ needle, results, index: results.length > 0 ? 0 : -1 })
          }
        })
        .catch((error: unknown) => {
          console.error('[chat] the search failed', error)
          if (!cancelled) {
            setState({ needle, results: [], index: -1 })
          }
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [active, needle, account, conversationId, messagesVersion])

  const select = useCallback((nextIndex: number) => {
    setState((previous) => {
      if (nextIndex < 0 || nextIndex >= previous.results.length) {
        return previous
      }
      return { ...previous, index: nextIndex }
    })
  }, [])

  /** Wraps around: the last hit's "next" is the first one again. */
  const step = useCallback((delta: number) => {
    setState((previous) => {
      if (previous.results.length === 0) {
        return previous
      }
      const from = previous.index < 0 ? 0 : previous.index
      const index = (from + delta + previous.results.length) % previous.results.length
      return { ...previous, index }
    })
  }, [])

  return {
    query,
    setQuery,
    results: settled.results,
    searching,
    index: settled.index,
    current: settled.results.at(settled.index) ?? null,
    select,
    next: useCallback(() => {
      step(1)
    }, [step]),
    previous: useCallback(() => {
      step(-1)
    }, [step]),
  }
}
