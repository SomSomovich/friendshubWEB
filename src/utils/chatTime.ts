import {
  format,
  formatDistanceToNowStrict,
  isThisYear,
  isToday,
  isYesterday,
  subDays,
  type Locale,
} from 'date-fns'
import { enUS, ru } from 'date-fns/locale'

/**
 * The timestamp shown on a chat row or a message bubble.
 *
 * The rule every messenger converges on: exact time for today, a word for
 * yesterday, a weekday for the past week, and a date beyond that — narrowing as
 * the timestamp gets older, so the common case carries the most information.
 */

const WEEKDAYS_AGO = 6

function localeFor(language: string): Locale {
  return language === 'en' ? enUS : ru
}

export function formatChatTimestamp(
  seconds: number,
  language: string,
  yesterdayLabel: string,
): string {
  const date = new Date(seconds * 1000)
  const locale = localeFor(language)

  if (isToday(date)) {
    return format(date, 'HH:mm', { locale })
  }
  if (isYesterday(date)) {
    return yesterdayLabel
  }
  if (date > subDays(new Date(), WEEKDAYS_AGO)) {
    return format(date, 'EEEE', { locale })
  }
  if (isThisYear(date)) {
    return format(date, 'd MMM', { locale })
  }
  return format(date, 'd MMM yyyy', { locale })
}

/** Groups messages by calendar day, in the reader's own timezone. */
export function dayKey(seconds: number): string {
  return format(new Date(seconds * 1000), 'yyyy-MM-dd')
}

/** "Today", "Yesterday", or the date itself, for a day separator. */
export function formatDayLabel(
  seconds: number,
  language: string,
  labels: { today: string; yesterday: string },
): string {
  const date = new Date(seconds * 1000)
  const locale = localeFor(language)
  if (isToday(date)) {
    return labels.today
  }
  if (isYesterday(date)) {
    return labels.yesterday
  }
  return isThisYear(date)
    ? format(date, 'EEEE, d MMMM', { locale })
    : format(date, 'd MMMM yyyy', { locale })
}

/** Full date and time, for a tooltip or a message's accessible label. */
export function formatFullTimestamp(seconds: number, language: string): string {
  return format(new Date(seconds * 1000), 'd MMM yyyy, HH:mm', {
    locale: localeFor(language),
  })
}

/** The time inside a message bubble. */
export function formatMessageTime(seconds: number): string {
  return format(new Date(seconds * 1000), 'HH:mm')
}

/**
 * How long ago somebody was last seen, without the "ago" — the caller supplies
 * the surrounding words, because Russian and English place them differently.
 *
 * `formatDistanceToNowStrict` rather than `formatDistanceToNow`: the latter
 * rounds up ("about 1 hour" for 55 minutes), which reads as an outright lie next
 * to a timestamp the reader can compare against.
 */
export function formatLastSeen(seconds: number, language: string): string {
  return formatDistanceToNowStrict(new Date(seconds * 1000), {
    locale: localeFor(language),
  })
}
