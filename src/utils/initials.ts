/**
 * Initials for an avatar placeholder.
 *
 * Two words give two letters ("John Doe" → "JD"), one word gives one
 * ("FriendsHub" → "F"), and anything that is not a letter or a digit is skipped
 * so a name like "👍 Team" still produces something readable.
 */
export function initialsOf(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0)

  const letters = words
    .map((word) => firstReadableCharacter(word))
    .filter((character): character is string => character !== null)

  return letters.slice(0, 2).join('').toUpperCase()
}

function firstReadableCharacter(word: string): string | null {
  for (const character of word) {
    if (/[\p{L}\p{N}]/u.test(character)) {
      return character
    }
  }
  return null
}
