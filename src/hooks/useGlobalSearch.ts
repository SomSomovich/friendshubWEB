import { useEffect, useState } from 'react'
import { searchGlobal, MIN_QUERY_LENGTH, type SearchResult, type SearchScope } from '../api/search'
import type { Account } from '../types'

/**
 * Global search, driven by the sidebar's field.
 *
 * The same box filters the chat list locally and asks the server about everyone
 * else; the local rows stay on top, because the conversation you already have is
 * almost always the one you meant. An `@` in front narrows the server's answer
 * to exact identifiers — FH numbers and handles — which is what somebody typing
 * one is after.
 */

const DEBOUNCE_MS = 300

export type GlobalSearchState = {
  /** Empty until there is something worth asking about. */
  results: SearchResult[]
  searching: boolean
  /** The `@` was stripped; the caller may want to show what is being matched. */
  needle: string
}

/** A finished search, tagged with the text it answered. */
type Answer = {
  needle: string
  results: SearchResult[]
}

const NOTHING: Answer = { needle: '', results: [] }

export function useGlobalSearch(account: Account, query: string): GlobalSearchState {
  const stripped = query.trim().startsWith('@')
  const needle = stripped ? query.trim().slice(1).trim() : query.trim()
  const scope: SearchScope = stripped ? 'identifiers' : 'all'
  const eligible = needle.length >= MIN_QUERY_LENGTH

  const [answer, setAnswer] = useState<Answer>(NOTHING)

  useEffect(() => {
    if (!eligible) {
      return
    }

    let cancelled = false
    const timer = setTimeout(() => {
      void searchGlobal(account, needle, scope)
        .then((results) => {
          if (!cancelled) {
            setAnswer({ needle, results })
          }
        })
        .catch((error: unknown) => {
          // A failed search shows nothing rather than an error: the local rows
          // are still there, and the field is not a place for a red message.
          console.warn('[search] the query failed', error)
          if (!cancelled) {
            setAnswer({ needle, results: [] })
          }
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [account, needle, scope, eligible])

  if (!eligible) {
    return { results: [], searching: false, needle }
  }
  // An answer for a different query is not an answer: showing it would put
  // yesterday's hits under today's typing.
  const settled = answer.needle === needle ? answer.results : []
  return { results: settled, searching: answer.needle !== needle, needle }
}
