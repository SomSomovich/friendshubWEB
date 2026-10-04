import { useEffect, useState } from 'react'
import { checkHandleAvailability } from '../api/handles'
import type { Account } from '../types'
import { normalizeHandle, validateHandle, type HandleProblem } from '../utils/handle'

/**
 * Whether a handle can be taken, answered while the user is still typing.
 *
 * The shape is checked locally first — instant, free, and the endpoint is rate
 * limited to 60 requests a minute — so only a well-formed name costs a request.
 * Those are debounced, which is what keeps a fast typist from spending the
 * minute's budget on prefixes of the name they are eventually going to type.
 */

const DEBOUNCE_MS = 400

export type HandleCheck =
  | { state: 'empty' }
  | { state: 'invalid'; problem: HandleProblem }
  | { state: 'checking' }
  | { state: 'available'; normalized: string }
  | { state: 'taken' }
  /** The check itself failed; the handle may still be fine. */
  | { state: 'unknown' }

/** The last server answer, tagged with the handle it was about. */
type RemoteCheck = {
  handle: string
  result: 'available' | 'taken' | 'unknown'
}

export function useHandleAvailability(
  account: Account,
  value: string,
  enabled: boolean,
): HandleCheck {
  const handle = normalizeHandle(value)
  const problem = validateHandle(handle)
  const [remote, setRemote] = useState<RemoteCheck | null>(null)

  useEffect(() => {
    // Only a well-formed, non-empty handle is worth a request, and an answer for
    // a different handle is ignored by the derivation below.
    if (!enabled || handle.length === 0 || validateHandle(handle) !== null) {
      return
    }

    let cancelled = false
    const timer = setTimeout(() => {
      void checkHandleAvailability(account, handle)
        .then((result) => {
          if (!cancelled) {
            setRemote({ handle, result: result.available ? 'available' : 'taken' })
          }
        })
        .catch((error: unknown) => {
          console.warn('[handles] the availability check failed', error)
          if (!cancelled) {
            setRemote({ handle, result: 'unknown' })
          }
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [account, handle, enabled])

  if (!enabled || handle.length === 0) {
    return { state: 'empty' }
  }
  if (problem !== null) {
    return { state: 'invalid', problem }
  }
  if (remote === null || remote.handle !== handle) {
    return { state: 'checking' }
  }
  switch (remote.result) {
    case 'available':
      return { state: 'available', normalized: handle }
    case 'taken':
      return { state: 'taken' }
    default:
      return { state: 'unknown' }
  }
}
