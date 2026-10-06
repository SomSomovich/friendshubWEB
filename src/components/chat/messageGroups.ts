import type { MessageRecord } from '../../storage/db'
import { dayKey, formatDayLabel } from '../../utils/chatTime'
import { isMessageRead } from '../../utils/readReceipts'

/**
 * The transcript, cut into days and labelled.
 *
 * Pure and separate from the list component because it is the one part of the
 * transcript with no DOM in it: given the same messages and language it produces
 * the same sections, which is what the day separators are asserted against.
 */

export type DayGroup = {
  /** The day key, also the anchor id of its heading. */
  key: string
  label: string
  messages: MessageRecord[]
}

export function groupByDay(
  chronological: MessageRecord[],
  language: string,
  labels: { today: string; yesterday: string },
): DayGroup[] {
  const groups: DayGroup[] = []

  for (const message of chronological) {
    const key = dayKey(message.clientTimestamp)
    const current = groups.at(-1)
    if (current === undefined || current.key !== key) {
      groups.push({
        key,
        label: formatDayLabel(message.clientTimestamp, language, labels),
        messages: [message],
      })
      continue
    }
    current.messages.push(message)
  }

  return groups
}

/**
 * The tick for one message.
 *
 * Only read is computed here — the rest is what the send path recorded, since
 * nothing else knows about it. A message this account did not send never shows a
 * tick at all, and `MessageBubble` only draws one for its own.
 */
export function statusFor(
  message: MessageRecord,
  selfAccountId: string,
  readWatermark: number,
): MessageRecord['status'] {
  if (
    message.senderAccountId === selfAccountId &&
    isMessageRead(message.serverTimestamp, readWatermark)
  ) {
    return 'read'
  }
  return message.status
}
