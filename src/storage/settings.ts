import { openDatabase } from './db'

/**
 * Per-device key/value state that is neither a secret nor a domain entity: sync
 * cursors (a `saved` history cursor, a bot update offset), onboarding flags, the
 * last seen client version.
 *
 * Values are strings; callers JSON-encode anything structured. Secrets do not
 * belong here — the session token lives in the account record, and preference
 * values (theme, language) never need the database at all.
 */

export async function getSetting(key: string): Promise<string | null> {
  const database = await openDatabase()
  const record = await database.get('settings', key)
  return record?.value ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await openDatabase()
  await database.put('settings', { key, value })
}
