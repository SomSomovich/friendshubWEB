import { useEffect, useState } from 'react'
import { getBotInfo } from '../api/bots'
import type { Account } from '../types'

/**
 * Handles for the bots in a channel's member list.
 *
 * A bot is not an account: it has no FH number, no profile and no place in the
 * contact list, so the only way to name one is `GET /bots/{id}/info`, which the
 * server answers to any signed-in account. The result is cached for the session
 * — a member list re-renders on every action taken in the settings screen, and
 * re-reading a bot's handle each time would be a request per keystroke's worth
 * of state.
 */

/** `null` means the read failed or the bot has no handle. */
const handles = new Map<string, string | null>()

export function useBotNames(account: Account, botIds: string[]): Map<string, string | null> {
  const [names, setNames] = useState<Map<string, string | null>>(new Map())
  // A string key so the effect does not re-run on every render, like
  // `useSenderNames`: the list is rebuilt each time, only its contents matter.
  const key = [...new Set(botIds)].sort().join(',')

  useEffect(() => {
    if (key.length === 0) {
      return
    }

    let cancelled = false
    const ids = key.split(',')
    void Promise.all(
      ids.map(async (id): Promise<[string, string | null]> => {
        const cached = handles.get(id)
        if (cached !== undefined) {
          return [id, cached]
        }
        try {
          const info = await getBotInfo(account, id)
          handles.set(id, info.handle)
          return [id, info.handle]
        } catch (error) {
          console.warn(`[conversation] the bot ${id} could not be read`, error)
          return [id, null]
        }
      }),
    ).then((entries) => {
      if (!cancelled) {
        setNames(new Map(entries))
      }
    })

    return () => {
      cancelled = true
    }
  }, [account, key])

  return names
}
