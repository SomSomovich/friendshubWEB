import { nowMillis } from '../utils/time'
import { openDatabase, type CachedDevice } from './db'

/**
 * Peer device lists are re-fetched for every send, so they are cached briefly.
 * Five minutes matches the native client: short enough that a revoked device
 * stops receiving envelopes quickly, long enough that a burst of messages does
 * not refetch the same list.
 */
export const DEVICES_CACHE_TTL_MS = 5 * 60 * 1000

/** Cached devices for a peer, or `null` when missing or expired. */
export async function getCachedDevices(
  accountId: string,
  peerAccountId: string,
): Promise<CachedDevice[] | null> {
  const database = await openDatabase()
  const key: [string, string] = [accountId, peerAccountId]
  const record = await database.get('devices_cache', key)

  if (!record) {
    return null
  }

  if (nowMillis() - record.cachedAt >= DEVICES_CACHE_TTL_MS) {
    // Remove the stale row instead of leaving it behind: a later put overwrites
    // it anyway, and an account purge then has less to scan.
    await database.delete('devices_cache', key)
    return null
  }

  return record.devices
}

export async function putCachedDevices(
  accountId: string,
  peerAccountId: string,
  devices: CachedDevice[],
): Promise<void> {
  const database = await openDatabase()
  await database.put('devices_cache', {
    accountId,
    peerAccountId,
    devices,
    cachedAt: nowMillis(),
  })
}
