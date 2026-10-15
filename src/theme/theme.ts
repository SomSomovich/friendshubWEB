import { readPreference, writePreference } from '../utils/browserStorage'

/** Themes the app supports. Dark is the default. */
export const THEMES = ['dark', 'light'] as const

export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'dark'

/**
 * Must match the key used by the bootstrap script in index.html.
 */
export const THEME_STORAGE_KEY = 'fh.theme'
export const CUSTOM_COLORS_STORAGE_KEY = 'fh.colors'

export type RgbColor = { r: number; g: number; b: number }

export type CustomColors = {
  background: RgbColor
  button: RgbColor
  bubble: RgbColor
  text: RgbColor
}

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

export function defaultCustomColors(theme: Theme): CustomColors {
  return theme === 'dark'
    ? {
        background: { r: 26, g: 26, b: 58 },
        button: { r: 252, g: 144, b: 3 },
        bubble: { r: 73, g: 57, b: 54 },
        text: { r: 244, g: 244, b: 251 },
      }
    : {
        background: { r: 255, g: 255, b: 255 },
        button: { r: 3, g: 11, b: 252 },
        bubble: { r: 204, g: 206, b: 244 },
        text: { r: 20, g: 20, b: 28 },
      }
}

export function isRgbColor(value: unknown): value is RgbColor {
  if (typeof value !== 'object' || value === null) return false
  const color = value as Record<string, unknown>
  return ['r', 'g', 'b'].every((channel) => {
    const component = color[channel]
    return typeof component === 'number' && Number.isInteger(component) && component >= 0 && component <= 255
  })
}

export function isCustomColors(value: unknown): value is CustomColors {
  if (typeof value !== 'object' || value === null) return false
  const colors = value as Record<string, unknown>
  return isRgbColor(colors.background) && isRgbColor(colors.button) && isRgbColor(colors.bubble) && isRgbColor(colors.text)
    && colorDistance(colors.background, colors.text) >= 20
}

export function readCustomColors(): CustomColors | null {
  const raw = readPreference(CUSTOM_COLORS_STORAGE_KEY)
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    return isCustomColors(value) ? value : null
  } catch {
    return null
  }
}

export function persistCustomColors(colors: CustomColors): void {
  writePreference(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(colors))
}

export function colorDistance(left: RgbColor, right: RgbColor): number {
  return Math.abs(left.r - right.r) + Math.abs(left.g - right.g) + Math.abs(left.b - right.b)
}

export function applyCustomColors(colors: CustomColors): void {
  const root = document.documentElement
  root.style.setProperty('--color-bg', cssRgb(colors.background))
  root.style.setProperty('--color-accent', cssRgb(colors.button))
  root.style.setProperty('--color-message-bubble', cssRgb(colors.bubble))
  root.style.setProperty('--color-fg', cssRgb(colors.text))
  root.style.setProperty('--color-accent-fg', foregroundFor(colors.button))
  syncThemeColorMeta()
}

export function clearCustomColors(): void {
  const root = document.documentElement
  for (const variable of ['--color-bg', '--color-accent', '--color-message-bubble', '--color-fg', '--color-accent-fg']) {
    root.style.removeProperty(variable)
  }
  syncThemeColorMeta()
}

function cssRgb(color: RgbColor): string {
  return `rgb(${color.r} ${color.g} ${color.b})`
}

function foregroundFor(color: RgbColor): string {
  const brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000
  return brightness >= 150 ? '#14141c' : '#ffffff'
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
