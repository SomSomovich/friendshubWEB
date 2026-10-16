import { useEffect, useState } from 'react'
import { listContacts } from '../api/contacts'
import { getAccountsBatch } from '../api/accounts'
import type { Account } from '../types'

/**
 * Display names for the people in a group conversation.
 *
 * A message carries only its sender's account id, so the name has to be looked
 * up. Contacts cover most of it; the rest are fetched from the public profile
 * and remembered for the session, because a busy group would otherwise ask for
 * the same handful of people on every render.
 */

/** The server charges each id and permits 50 ids per account each minute. */
const MAX_PROFILE_LOOKUPS = 50
const PROFILE_LOOKUP_WINDOW_MS = 60_000

const profileNames = new Map<string, string | null>()
const profileLookupTimes = new Map<string, number[]>()

function profileCacheKey(accountId: string, targetAccountId: string): string {
  return `${accountId}:${targetAccountId}`
}

function reserveProfileLookupSlots(accountId: string, requested: number): number {
  const now = Date.now()
  const recent = (profileLookupTimes.get(accountId) ?? []).filter(
    (timestamp) => now - timestamp < PROFILE_LOOKUP_WINDOW_MS,
  )
  const allowed = Math.min(requested, MAX_PROFILE_LOOKUPS - recent.length)
  recent.push(...Array.from({ length: allowed }, () => now))
  profileLookupTimes.set(accountId, recent)
  return allowed
}

export async function primeSenderNames(
  account: Account,
  senderIds: string[],
  limit: number = MAX_PROFILE_LOOKUPS,
): Promise<Map<string, string>> {
  const names = new Map<string, string>()

  const contacts = await listContacts(account).catch(() => [])
  for (const contact of contacts) {
    names.set(contact.targetAccountId, contact.localUsername ?? contact.username)
  }

  const unknown = senderIds.filter((id) => id !== account.id && !names.has(id))
  const missing: string[] = []
  for (const id of unknown) {
    const key = profileCacheKey(account.id, id)
    if (profileNames.has(key)) {
      const cached = profileNames.get(key)
      if (cached !== null && cached !== undefined) names.set(id, cached)
    } else {
      missing.push(id)
    }
  }
  try {
    const allowed = reserveProfileLookupSlots(account.id, Math.min(limit, missing.length))
    const requestIds = missing.slice(0, allowed)
    if (requestIds.length > 0) {
      const profiles = await getAccountsBatch(account, requestIds)
      const returned = new Map(profiles.map((profile) => [profile.accountId, profile.username]))
      // Hidden or deleted profiles are deliberately omitted by the API. Cache
      // that absence for this session as well, or every new group view would
      // spend another rate-limited slot on the same ids.
      for (const id of requestIds) {
        const username = returned.get(id) ?? null
        profileNames.set(profileCacheKey(account.id, id), username)
        if (username !== null) names.set(id, username)
      }
    }
  } catch (error) {
    console.warn('[chat] account names could not be resolved', error)
  }

  return names
}

/**
 * @param senderIds the distinct senders currently on screen. Only new ones cost
 *                  a request, so this can be derived from the message list.
 * @param limit     how many unknown ids may cost a profile read, capped by the
 *                  server's per-account minute limit.
 */
export function useSenderNames(
  account: Account,
  senderIds: string[],
  limit: number = MAX_PROFILE_LOOKUPS,
): Map<string, string> {
  const [names, setNames] = useState<Map<string, string>>(new Map())
  // A string key so the effect does not re-run on every render: the list is
  // rebuilt each time, and only its contents matter.
  const key = [...senderIds].sort().join(',')

  useEffect(() => {
    // Nothing to resolve costs nothing: `primeSenderNames` reads the contact
    // list even when it is given no ids, and a screen that is merely mounted —
    // a profile dialog that has not been opened — must not.
    if (key.length === 0) {
      return
    }

    let cancelled = false
    void primeSenderNames(account, key.split(','), limit).then((resolved) => {
      if (!cancelled) {
        setNames(resolved)
      }
    })
    return () => {
      cancelled = true
    }
  }, [account, key, limit])

  return names
}
