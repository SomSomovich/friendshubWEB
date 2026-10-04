/**
 * The handle rules from API_FRONTEND.txt §20, applied before a request is made.
 *
 * A handle is 5–32 characters, starts with a letter, and continues with letters,
 * digits and underscores. Groups and channels must *not* end in "bot" — that
 * suffix marks a bot handle, and the server rejects it for anything else.
 */

export const MIN_HANDLE_LENGTH = 5
export const MAX_HANDLE_LENGTH = 32

/** Names the server keeps for itself. */
const RESERVED = new Set(['admin', 'support', 'help', 'system', 'botfather'])

const HANDLE_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/

export type HandleProblem = 'tooShort' | 'tooLong' | 'badFirst' | 'badChars' | 'reserved' | 'botSuffix'

/** Normalised form: handles are compared and stored in lower case. */
export function normalizeHandle(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * `null` means the server would accept this shape.
 *
 * Groups and channels share the rule — only a bot may end in "bot" — so there is
 * nothing for a kind parameter to decide.
 */
export function validateHandle(value: string): HandleProblem | null {
  const handle = normalizeHandle(value)

  if (handle.length < MIN_HANDLE_LENGTH) {
    return 'tooShort'
  }
  if (handle.length > MAX_HANDLE_LENGTH) {
    return 'tooLong'
  }
  if (!/^[a-zA-Z]/.test(handle)) {
    return 'badFirst'
  }
  if (!HANDLE_PATTERN.test(handle)) {
    return 'badChars'
  }
  if (RESERVED.has(handle)) {
    return 'reserved'
  }
  // Saying so now beats a 400 after the group has already been created.
  if (handle.endsWith('bot')) {
    return 'botSuffix'
  }
  return null
}
