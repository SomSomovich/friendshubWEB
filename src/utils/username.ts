/**
 * The display-name rules the server enforces (`PUT /profile/username`).
 *
 * Letters, digits, underscore, dot and single spaces, 1–64 characters. Hyphens
 * are *not* accepted, which is worth stating because they look like they should
 * be: the endpoint answers 400 for one, so accepting it here would only move the
 * rejection to the server and make it look like a bug.
 */

export const MAX_USERNAME_LENGTH = 64

/** Words of allowed characters, one space between them, no leading or trailing. */
const USERNAME_PATTERN = /^[A-Za-z0-9_.]+(?: [A-Za-z0-9_.]+)*$/

export type UsernameProblem = 'empty' | 'tooLong' | 'invalid' | 'looksLikeFhNumber'

/**
 * `FH` followed by digits is reserved for the numbers the server issues, and a
 * name that looks like one is refused (API_FRONTEND.md §4). Blocked here rather
 * than after a round trip so the reason can be explained while it is being typed.
 */
const FH_NUMBER_PATTERN = /^FH\d+$/i

/** `null` means the value is acceptable to send. */
export function validateUsername(value: string): UsernameProblem | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return 'empty'
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return 'tooLong'
  }
  if (FH_NUMBER_PATTERN.test(trimmed)) {
    return 'looksLikeFhNumber'
  }
  return USERNAME_PATTERN.test(trimmed) ? null : 'invalid'
}
