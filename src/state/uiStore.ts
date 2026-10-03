import { create } from 'zustand'
import { i18n } from '../i18n/index'
import { normalizeLanguage, persistLanguage, applyDocumentLanguage, type Language } from '../i18n/language'
import { applyTheme, isTheme, persistTheme, readActiveTheme, type Theme } from '../theme/theme'

/**
 * App-wide state: the things that are not per account.
 *
 * Theme and language live here rather than in React context (Phase 1 put them
 * there) because there must be exactly one source for them — a store plus a
 * context holding copies of the same values is how the two drift apart.
 */

export type CallStatus = 'idle' | 'ringing' | 'active' | 'ended'

export type CallState = {
  callId: string | null
  peerAccountId: string | null
  status: CallStatus
  /** Audio-only or video, so the call screen knows which controls to show. */
  withVideo: boolean
}

export type UiState = {
  theme: Theme
  language: Language
  activeAccountId: string | null
  /** Mobile sidebar; on desktop the list is always visible. */
  sidebarOpen: boolean
  callState: CallState

  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setLanguage: (language: Language) => void
  setActiveAccount: (accountId: string | null) => void
  setSidebarOpen: (open: boolean) => void
  setCallState: (state: CallState) => void
  clearCall: () => void
}

const IDLE_CALL: CallState = {
  callId: null,
  peerAccountId: null,
  status: 'idle',
  withVideo: false,
}

/** The theme the bootstrap script in index.html already applied to the document. */
function initialTheme(): Theme {
  const attribute = document.documentElement.getAttribute('data-theme')
  return isTheme(attribute) ? attribute : readActiveTheme()
}

function initialLanguage(): Language {
  return normalizeLanguage(i18n.language) ?? 'ru'
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme(),
  language: initialLanguage(),
  activeAccountId: null,
  sidebarOpen: false,
  callState: IDLE_CALL,

  setTheme: (theme) => {
    // Applied and persisted here so every caller — the switcher, a future
    // settings screen, the cross-tab storage listener — goes through one path.
    applyTheme(theme)
    persistTheme(theme)
    set({ theme })
  },

  toggleTheme: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
  },

  setLanguage: (language) => {
    applyDocumentLanguage(language)
    persistLanguage(language)
    void i18n.changeLanguage(language)
    set({ language })
  },

  setActiveAccount: (accountId) => {
    set({ activeAccountId: accountId })
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open })
  },

  setCallState: (state) => {
    set({ callState: state })
  },

  clearCall: () => {
    set({ callState: IDLE_CALL })
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
  if (event.key !== 'fh.theme' || !isTheme(event.newValue)) {
    return
  }
  // Another tab already wrote the value; applying it here must not write again.
  applyTheme(event.newValue)
  useUiStore.setState({ theme: event.newValue })
})
