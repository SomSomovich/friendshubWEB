import { writePreference } from '../utils/browserStorage'

/** Themes the app supports. Dark is the default. */
export const THEMES = ['dark', 'light'] as const

export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'dark'

/**
 * Must match the key used by the bootstrap script in index.html.
 */
export const THEME_STORAGE_KEY = 'fh.theme'

const THEME_ATTRIBUTE = 'data-theme'
const THEME_COLOR_META_SELECTOR = 'meta[name="theme-color"]'

const THEME_VALUES: ReadonlySet<string> = new Set(THEMES)

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && THEME_VALUES.has(value)
}

/** Reads the theme currently applied to the document. */
export function readActiveTheme(): Theme {
  const attribute = document.documentElement.getAttribute(THEME_ATTRIBUTE)
  return isTheme(attribute) ? attribute : DEFAULT_THEME
}

/**
 * Applies the theme to the document and syncs the browser UI colour with it.
 * The initial value is applied by the bootstrap script in index.html; every
 * later change goes through here.
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme)
  syncThemeColorMeta()
}

export function persistTheme(theme: Theme): void {
  writePreference(THEME_STORAGE_KEY, theme)
}

/**
 * Reads the resolved `--color-bg` token rather than duplicating the palette in
 * JavaScript, so the two can never drift apart.
 */
function syncThemeColorMeta(): void {
  const meta = document.querySelector(THEME_COLOR_META_SELECTOR)
  if (!meta) {
    return
  }

  const background = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-bg')
    .trim()

  if (background) {
    meta.setAttribute('content', background)
  }
}
