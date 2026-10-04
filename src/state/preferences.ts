import { setSetting } from '../storage/settings'

/**
 * UI preferences live in two places, deliberately.
 *
 * `localStorage` is what the bootstrap script in `index.html` reads, because the
 * theme has to be applied before the first paint and IndexedDB cannot be read
 * synchronously. The `settings` store in IndexedDB is the durable record, so a
 * cleared browser profile still has the preference alongside the accounts.
 *
 * The mirror is fire-and-forget: a preference must never make a click fail.
 */

export const THEME_PREFERENCE_KEY = 'fh.theme'
export const LANGUAGE_PREFERENCE_KEY = 'fh.lang'
export const ACTIVE_ACCOUNT_PREFERENCE_KEY = 'fh.activeAccount'

export function mirrorPreference(key: string, value: string | null): void {
  // JSON so that "cleared" is recorded as such rather than left as a stale row.
  void setSetting(key, JSON.stringify(value)).catch((error: unknown) => {
    console.warn(`[state] could not mirror "${key}" into IndexedDB`, error)
  })
}
