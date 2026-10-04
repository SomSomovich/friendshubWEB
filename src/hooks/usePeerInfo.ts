import { useCallback, useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { getAccountPresence, getAccountProfile, type PublicProfile } from '../api/profile'
import { requireAccountStore } from '../state/accountRegistry'
import type { Account } from '../types'
import type { PresenceEvent } from '../ws/events'

/**
 * What a conversation needs to know about the person on the other side: their
 * public profile, and whether they are around.
 *
 * Presence is written into the store rather than kept here, because the
 * WebSocket pushes updates into the same place — one source means a poll that
 * lands late cannot overwrite a live event with something staler. The REST read
 * only fills the gaps the socket has not covered: after a reload, or for a peer
 * whose status changed while this tab was closed.
 */

/** How often the fallback presence read runs. */
const PRESENCE_POLL_MS = 60_000

export type PeerInfo = {
  profile: PublicProfile | null
  presence: PresenceEvent | null
  /** Re-reads the profile, e.g. after the peer was blocked or added to contacts. */
  refreshProfile: () => void
}

export function usePeerInfo(account: Account, peerAccountId: string | null): PeerInfo {
  const store = requireAccountStore(account.id)
  const presence = useStore(store, (state) =>
    peerAccountId === null ? null : (state.presence[peerAccountId] ?? null),
  )
  // The profile is stored together with the peer it belongs to, so moving to
  // another conversation shows nothing rather than the previous person's name.
  const [loaded, setLoaded] = useState<{ peerAccountId: string; profile: PublicProfile | null } | null>(
    null,
  )
  const [token, setToken] = useState(0)
  const profile = loaded !== null && loaded.peerAccountId === peerAccountId ? loaded.profile : null

  useEffect(() => {
    if (peerAccountId === null) {
      return
    }

    let cancelled = false
    void getAccountProfile(account, peerAccountId)
      .then((fetched) => {
        if (!cancelled) {
          setLoaded({ peerAccountId, profile: fetched })
        }
      })
      .catch((error: unknown) => {
        // A profile that cannot be read costs a name and a button, not the chat.
        console.warn('[chat] could not read the peer profile', error)
        if (!cancelled) {
          setLoaded({ peerAccountId, profile: null })
        }
      })

    return () => {
      cancelled = true
    }
  }, [account, peerAccountId, token])

  useEffect(() => {
    if (peerAccountId === null) {
      return
    }

    let cancelled = false
    const read = (): void => {
      void getAccountPresence(account, peerAccountId)
        .then((fetched) => {
          if (!cancelled) {
            store.getState().actions.setPresence(fetched)
          }
        })
        .catch((error: unknown) => {
          // No presence is a normal answer: the account only exposes it to
          // people who share a conversation, and to nobody while invisible.
          console.warn('[chat] presence is unavailable', error)
        })
    }

    read()
    const timer = setInterval(read, PRESENCE_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [account, peerAccountId, store])

  const refreshProfile = useCallback(() => {
    setToken((value) => value + 1)
  }, [])

  return { profile, presence, refreshProfile }
}
