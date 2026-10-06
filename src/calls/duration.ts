import { intervalToDuration } from 'date-fns'

/**
 * Elapsed seconds as the clock on the call screen.
 *
 * The arithmetic is date-fns' (`intervalToDuration`), not a hand-rolled division
 * chain, so leap seconds and month lengths cannot creep in — but the *shape* is
 * a stopwatch rather than a spoken duration: `MM:SS` under an hour and `H:MM:SS`
 * above it, which is what every phone shows and what survives being watched for
 * two hours.
 */
export function formatCallDuration(elapsedSeconds: number): string {
  const total = Math.max(0, Math.floor(elapsedSeconds))
  const { hours = 0, minutes = 0, seconds = 0 } = intervalToDuration({
    start: 0,
    end: total * 1_000,
  })

  const pad = (value: number): string => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}
