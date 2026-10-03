import { useUiStore, type UiState } from '../state/uiStore'

/**
 * Theme state, read from the UI store.
 *
 * Phase 1 kept this in React context; the store now owns it so there is a single
 * source of truth, and this hook keeps the call sites as they were.
 */
export function useTheme(): {
  theme: UiState['theme']
  setTheme: UiState['setTheme']
  toggleTheme: UiState['toggleTheme']
} {
  const theme = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)
  const toggleTheme = useUiStore((state) => state.toggleTheme)
  return { theme, setTheme, toggleTheme }
}
