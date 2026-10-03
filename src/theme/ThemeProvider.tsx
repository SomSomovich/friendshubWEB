import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyTheme,
  isTheme,
  persistTheme,
  readActiveTheme,
  type Theme,
} from './theme'
import { ThemeContext, type ThemeContextValue } from './themeContext'

type ThemeProviderProps = {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  /**
   * The bootstrap script in index.html has already applied the stored theme, so
   * the document — not localStorage — is the source of truth on first render.
   */
  const [theme, setThemeState] = useState<Theme>(readActiveTheme)

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    persistTheme(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  // Layout effect so the attribute and meta colour change before the browser
  // paints: no frame is ever rendered with stale tokens.
  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Keep other tabs on the same machine in sync.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) {
        return
      }
      setThemeState(isTheme(event.newValue) ? event.newValue : DEFAULT_THEME)
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
