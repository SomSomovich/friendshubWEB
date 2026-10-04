import { format, isThisYear, isToday, isYesterday, subDays, type Locale } from 'date-fns'
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

/** Full date and time, for a tooltip or a message's accessible label. */
export function formatFullTimestamp(seconds: number, language: string): string {
  return format(new Date(seconds * 1000), 'd MMM yyyy, HH:mm', {
    locale: localeFor(language),
  })
}
