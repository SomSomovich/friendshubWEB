import { getIceServers } from '../api/webrtc'
import type { Account } from '../types'
import { nowMillis } from '../utils/time'

/**
 * The ICE configuration, cached for as long as the server says it is valid.
 *
 * STUN and TURN URLs are never written down here: the TURN credentials are
 * HMAC-derived per account and expire, so a hardcoded server would either go
 * stale or be a lie about where the traffic goes. `GET /webrtc/ice-servers`
 * returns both the list and its lifetime, and this module is the one place that
 * remembers it.
 *
 * The entry is dropped slightly *before* the server's own expiry, so a call that
 * starts near the boundary refreshes rather than handing an expired credential
 * to `RTCPeerConnection`.
 */

/** Refresh this long before the credentials expire. */
const REFRESH_MARGIN_MS = 60_000
/** Used when the response carries no usable TTL; the credentials still work. */
const FALLBACK_TTL_MS = 10 * 60_000
/** Never cache for less than this, or a tiny TTL would mean a fetch per call. */
const MIN_CACHE_MS = 30_000

type CacheEntry = {
  accountId: string
  servers: RTCIceServer[]
  /** Epoch milliseconds after which the entry must be re-fetched. */
  refreshAt: number
}

let cache: CacheEntry | null = null
/** One in-flight request, shared by callers that ask while it is running. */
let inFlight: Promise<RTCIceServer[]> | null = null
let inFlightAccountId: string | null = null

/** Forgets the cache; used when the account changes or a connection is reset. */
export function invalidateIceServers(): void {
  cache = null
  inFlight = null
  inFlightAccountId = null
}

export async function getIceServersFor(account: Account): Promise<RTCIceServer[]> {
  if (
    cache !== null &&
    cache.accountId === account.id &&
    cache.refreshAt > nowMillis()
  ) {
    return cache.servers
  }

  if (inFlight !== null && inFlightAccountId === account.id) {
    return inFlight
  }

  const promise = fetchIceServers(account).finally(() => {
    if (inFlight === promise) {
      inFlight = null
      inFlightAccountId = null
    }
  })
  inFlight = promise
  inFlightAccountId = account.id
  return promise
}

async function fetchIceServers(account: Account): Promise<RTCIceServer[]> {
  const response = await getIceServers(account)
  const ttlMs = response.ttlSeconds > 0 ? response.ttlSeconds * 1_000 : FALLBACK_TTL_MS

  cache = {
    accountId: account.id,
    servers: response.iceServers,
    refreshAt: nowMillis() + Math.max(ttlMs - REFRESH_MARGIN_MS, MIN_CACHE_MS),
  }
  return cache.servers
}
