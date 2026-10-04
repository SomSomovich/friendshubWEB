import type { TFunction } from 'i18next'
import { formatLastSeen } from '../../utils/chatTime'
import type { PresenceEvent } from '../../ws/events'

/**
 * The line under a direct conversation's title.
 *
 * `null` when there is nothing honest to say: an account that hides its presence
 * from this viewer reports nothing at all, and "был(а) давно" would be a
 * statement the server never made.
 */
export function presenceText(
  presence: PresenceEvent | null,
  language: string,
  t: TFunction,
): string | null {
  if (presence === null) {
    return null
  }
  if (presence.isOnline) {
    return t('chat.presence.online')
  }
  if (presence.lastSeen === null) {
    return null
  }
  return t('chat.presence.lastSeen', { time: formatLastSeen(presence.lastSeen, language) })
}
