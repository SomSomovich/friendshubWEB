/**
 * Access to `localStorage` for non-sensitive UI preferences only — the theme and
 * the interface language.
 *
 * Anything secret — session tokens, crypto snapshots, message history — belongs
 * in IndexedDB. `localStorage` can also be unavailable (private mode, blocked
 * cookies) or throw on quota, so every access is guarded.
 */

export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch (error) {
    console.warn(`[storage] cannot read "${key}" from localStorage`, error)
    return null
  }
}

export function writePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch (error) {
    console.warn(`[storage] cannot write "${key}" to localStorage`, error)
  }
}
