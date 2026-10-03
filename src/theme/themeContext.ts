import { createContext } from 'react'
import type { Theme } from './theme'

export type ThemeContextValue = {
  /** Theme currently applied to the document. */
  theme: Theme
  /** Applies and persists a theme. */
  setTheme: (theme: Theme) => void
  /** Switches between dark and light. */
  toggleTheme: () => void
}

/**
 * Deliberately `null` outside a provider so `useTheme` fails loudly instead of
 * silently falling back to a default.
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null)
