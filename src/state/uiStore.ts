import { create } from 'zustand'
import { i18n } from '../i18n/index'
import {
  applyDocumentLanguage,
  normalizeLanguage,
  persistLanguage,
  type Language,
} from '../i18n/language'
import { applyCustomColors, applyTheme, clearCustomColors, colorDistance, isCustomColors, isTheme, persistCustomColors, persistTheme, readActiveTheme, readCustomColors, type CustomColors, type Theme } from '../theme/theme'
import { removePreference, writePreference } from '../utils/browserStorage'
import {
  ACTIVE_ACCOUNT_PREFERENCE_KEY,
  CUSTOM_COLORS_PREFERENCE_KEY,
  LANGUAGE_PREFERENCE_KEY,
  THEME_PREFERENCE_KEY,
  mirrorPreference,
} from './preferences'

/**
 * App-wide state: the things that are not per account.
 *
 * Theme and language live here rather than in React context (Phase 1 put them
 * there) because there must be exactly one source for them — a store plus a
 * context holding copies of the same values is how the two drift apart.
 *
 * Each preference is written to `localStorage` (the bootstrap script reads it
 * before the first paint) and mirrored into IndexedDB, which is the durable
 * record. See `preferences.ts` for why both.
 */

export type UiState = {
  theme: Theme
  customColors: CustomColors | null
  language: Language
  activeAccountId: string | null
  /** False until the stored accounts have been read; guards wait for it. */
  sessionReady: boolean
  /** Mobile sidebar; on desktop the list is always visible. */
  sidebarOpen: boolean
  /**
   * Whose profile the modal is showing.
   *
   * App-wide rather than local to a screen: an avatar is a way into a profile
   * from the chat list, a message and a header alike, and one modal at the top
   * of the shell serves all three.
   */
  profileAccountId: string | null
  /**
   * Bumped whenever the signed-in account's own record changes — its avatar, its
   * username, its status.
   *
   * The account lives on a vanilla store that screens read with `getState()`, so
   * nothing re-renders when it is written. Everything that draws it subscribes
   * to this instead; an avatar upload in particular has to, because the browser
   * caches the 404 of an account that had no picture.
   */
  accountRevision: number

  setTheme: (theme: Theme) => void
  setCustomColors: (colors: CustomColors) => void
  resetCustomColors: () => void
  toggleTheme: () => void
  setLanguage: (language: Language) => void
  setActiveAccount: (accountId: string | null) => void
  setSessionReady: (ready: boolean) => void
  setSidebarOpen: (open: boolean) => void
  openProfile: (accountId: string) => void
  closeProfile: () => void
  bumpAccountRevision: () => void
}

/** The theme the bootstrap script in index.html already applied to the document. */
function initialTheme(): Theme {
  const attribute = document.documentElement.getAttribute('data-theme')
  return isTheme(attribute) ? attribute : readActiveTheme()
}

function initialLanguage(): Language {
  return normalizeLanguage(i18n.language) ?? 'ru'
}

function initialCustomColors(): CustomColors | null {
  const colors = readCustomColors()
  if (colors !== null) applyCustomColors(colors)
  return colors
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme(),
  customColors: initialCustomColors(),
  language: initialLanguage(),
  activeAccountId: null,
  sessionReady: false,
  sidebarOpen: false,
  profileAccountId: null,
  accountRevision: 0,

  setTheme: (theme) => {
    // Applied and persisted here so every caller — the switcher, a settings
    // screen, the cross-tab listener — goes through one path.
    applyTheme(theme)
    const customColors = get().customColors
    if (customColors !== null) applyCustomColors(customColors)
    persistTheme(theme)
    mirrorPreference(THEME_PREFERENCE_KEY, theme)
    set({ theme })
  },

  setCustomColors: (colors) => {
    if (colorDistance(colors.background, colors.text) < 20) return
    applyCustomColors(colors)
    persistCustomColors(colors)
    mirrorPreference(CUSTOM_COLORS_PREFERENCE_KEY, colors)
    set({ customColors: colors })
  },

  resetCustomColors: () => {
    clearCustomColors()
    removePreference(CUSTOM_COLORS_PREFERENCE_KEY)
    mirrorPreference(CUSTOM_COLORS_PREFERENCE_KEY, null)
    set({ customColors: null })
  },

  toggleTheme: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
  },

  setLanguage: (language) => {
    applyDocumentLanguage(language)
    persistLanguage(language)
    mirrorPreference(LANGUAGE_PREFERENCE_KEY, language)
    void i18n.changeLanguage(language)
    set({ language })
  },

  setActiveAccount: (accountId) => {
    writePreference(ACTIVE_ACCOUNT_PREFERENCE_KEY, accountId ?? '')
    mirrorPreference(ACTIVE_ACCOUNT_PREFERENCE_KEY, accountId)
    set({ activeAccountId: accountId })
  },

  setSessionReady: (ready) => {
    set({ sessionReady: ready })
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open })
  },

  openProfile: (accountId) => {
    set({ profileAccountId: accountId })
  },

  closeProfile: () => {
    set({ profileAccountId: null })
  },

  bumpAccountRevision: () => {
    set({ accountRevision: get().accountRevision + 1 })
  },
}))

/**
 * Keeps the store in step with the theme another tab chose.
 *
 * Registered at module scope once: a subscription is harmless if nothing imports
 * this store (then nothing renders either), and it cannot be forgotten by a
 * component that happens to mount late.
 */
window.addEventListener('storage', (event) => {
  if (event.key !== THEME_PREFERENCE_KEY || !isTheme(event.newValue)) {
    return
  }
  // Another tab already wrote the value; applying it here must not write again.
  applyTheme(event.newValue)
  const customColors = useUiStore.getState().customColors
  if (customColors !== null) applyCustomColors(customColors)
  useUiStore.setState({ theme: event.newValue })
})

window.addEventListener('storage', (event) => {
  if (event.key !== CUSTOM_COLORS_PREFERENCE_KEY) return
  const raw = event.newValue
  if (raw === null) {
    clearCustomColors()
    useUiStore.setState({ customColors: null })
    return
  }
  try {
    const value: unknown = JSON.parse(raw)
    if (isCustomColors(value)) {
      applyCustomColors(value)
      useUiStore.setState({ customColors: value })
    }
  } catch {
    // Ignore malformed preferences from another tab.
  }
})
