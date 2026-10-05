import type { AccountAuth } from './auth'
import { get } from './client'

/**
 * Global search (API_FRONTEND.txt §23).
 *
 * Two modes, and the difference is what the query is matched against rather than
 * what comes back: `identifiers` searches FH numbers and handles exactly, which
 * is what the `@` prefix in the search field means, and `all` also matches
 * usernames and titles fuzzily.
 */

export type SearchScope = 'identifiers' | 'all'

export type SearchEntityType = 'account' | 'group' | 'channel' | 'bot'

export type SearchResult = {
  entityType: SearchEntityType
  entityId: string
  displayName: string
  /** An FH number, a handle — or `null` for a group or channel without one. */
  identifier: string | null
  /** A path on the API's own origin, or `null`. */
  avatarUrl: string | null
}

/** The server's floor and ceiling for a query, which the UI mirrors. */
export const MIN_QUERY_LENGTH = 3
export const MAX_QUERY_LENGTH = 64

export function searchGlobal(
  account: AccountAuth,
  query: string,
  scope: SearchScope = 'all',
  limit = 20,
): Promise<SearchResult[]> {
  return get<{ results: SearchResult[] }>('/search', {
    account,
    query: { q: query, scope, limit },
  }).then((response) => response.results)
}
