import type { AccountAuth } from './auth'
import { get, post } from './client'

/**
 * Handles resolve to a group, a channel or a bot. They are 5..32 characters,
 * start with a letter, normalise to lowercase, and bot handles must end in
 * "bot" — hence the `handleKind` hint on the availability check.
 */

export type HandleEntityType = 'group' | 'channel' | 'bot'

export type HandleResolution = {
  entityType: HandleEntityType
  entityId: string
  handleDisplay: string
  handleNormalized: string
}

export type BatchResolutionItem = {
  handleInput: string
  normalized: string
  found: boolean
  entityType: HandleEntityType | null
  entityId: string | null
  handleDisplay: string | null
  handleNormalized: string | null
}

export type HandleAvailability = {
  handle: string
  normalized: string
  available: boolean
  /** Which shape the name fits: bot handles must end in "bot", others must not. */
  handleKind: 'bot' | 'regular'
}

/** Rate limited to 60 requests per account per minute. */
export function resolveHandle(account: AccountAuth, handle: string): Promise<HandleResolution> {
  return get<HandleResolution>(`/handles/${encodeURIComponent(handle)}`, { account })
}

/** Resolves up to 200 handles in one call. */
export function resolveHandles(
  account: AccountAuth,
  handles: string[],
): Promise<BatchResolutionItem[]> {
  return post<{ items: BatchResolutionItem[] }>('/handles/batch', { handles }, { account }).then(
    (response) => response.items,
  )
}

export function checkHandleAvailability(
  account: AccountAuth,
  handle: string,
): Promise<HandleAvailability> {
  return get<HandleAvailability>(`/handles/${encodeURIComponent(handle)}/available`, { account })
}
