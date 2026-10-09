import { useEffect, useState } from 'react'
import { listContacts } from '../api/contacts'
import { getAccountProfile } from '../api/profile'
import type { Account } from '../types'

/**
 * Display names for the people in a group conversation.
 *
 * A message carries only its sender's account id, so the name has to be looked
 * up. Contacts cover most of it; the rest are fetched from the public profile
 * and remembered for the session, because a busy group would otherwise ask for
 * the same handful of people on every render.
 */

/** Beyond this, a group is asking for more lookups than a screen can show. */
const MAX_PROFILE_LOOKUPS = 25

const profileNames = new Map<string, string>()

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
  const pending = unknown.slice(0, limit).map(async (id) => {
    const cached = profileNames.get(id)
    if (cached !== undefined) {
      names.set(id, cached)
      return
    }
    try {
      const profile = await getAccountProfile(account, id)
      profileNames.set(id, profile.username)
      names.set(id, profile.username)
    } catch (error) {
      // No name is survivable; a missing message is not.
      console.warn(`[chat] could not read the profile of ${id}`, error)
    }
  })
  await Promise.all(pending)

  return names
}

/**
 * @param senderIds the distinct senders currently on screen. Only new ones cost
 *                  a request, so this can be derived from the message list.
 * @param limit     how many unknown ids may cost a profile read. A member list
 *                  names more people than a screenful of messages does, but not
 *                  unboundedly: a thousand-member group must not fire a thousand
 *                  requests, so the rest fall back to "unknown peer".
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
