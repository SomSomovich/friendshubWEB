import { getSetting, setSetting } from './settings'

function key(accountId: string): string {
  return `temporary_room_expirations:${accountId}`
}

export async function getTemporaryRoomExpiry(
  accountId: string,
  conversationId: string,
): Promise<number | null> {
  const raw = await getSetting(key(accountId))
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
    const expiry = (value as Record<string, unknown>)[conversationId]
    return typeof expiry === 'number' && Number.isFinite(expiry) ? expiry : null
  } catch (error) {
    console.warn('[storage] temporary room expirations could not be read', error)
    return null
  }
}

export async function rememberTemporaryRoomExpiry(
  accountId: string,
  conversationId: string,
  expiresAt: number,
): Promise<void> {
  const raw = await getSetting(key(accountId))
  let expirations: Record<string, number> = {}
  if (raw !== null) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        expirations = Object.fromEntries(
          Object.entries(parsed).filter((entry): entry is [string, number] =>
            typeof entry[1] === 'number' && Number.isFinite(entry[1]),
          ),
        )
      }
    } catch (error) {
      console.warn('[storage] replacing unreadable temporary room expirations', error)
    }
  }
  expirations[conversationId] = expiresAt
  await setSetting(key(accountId), JSON.stringify(expirations))
}

export async function forgetTemporaryRoomExpiry(accountId: string, conversationId: string): Promise<void> {
  const raw = await getSetting(key(accountId))
  if (raw === null) return
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return
    const expirations = { ...(value as Record<string, unknown>) }
    delete expirations[conversationId]
    await setSetting(key(accountId), JSON.stringify(expirations))
  } catch (error) {
    console.warn('[storage] temporary room expiry could not be removed', error)
  }
}
