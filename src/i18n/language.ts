import { readPreference, writePreference } from '../utils/browserStorage'

export const SUPPORTED_LANGUAGES = ['ru', 'en'] as const

export type Language = (typeof SUPPORTED_LANGUAGES)[number]

/** Fallback per the product spec: Russian. */
export const DEFAULT_LANGUAGE: Language = 'ru'

/**
 * Must match the key used by the bootstrap script in index.html.
 */
export const LANGUAGE_STORAGE_KEY = 'fh.lang'

const LANGUAGE_VALUES: ReadonlySet<string> = new Set(SUPPORTED_LANGUAGES)

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGE_VALUES.has(value)
}

/** Maps a BCP-47 tag ("ru-RU", "en-US") to a supported language, or `null`. */
export function normalizeLanguage(tag: string): Language | null {
  const primary = tag.toLowerCase().split('-')[0] ?? ''
  return isLanguage(primary) ? primary : null
}

/**
 * Mirrors the bootstrap script in index.html: stored preference first, then
 * `navigator.language`, then Russian.
 */
export function resolveInitialLanguage(): Language {
  const stored = readPreference(LANGUAGE_STORAGE_KEY)
  if (isLanguage(stored)) {
    return stored
  }

  return normalizeLanguage(navigator.language) ?? DEFAULT_LANGUAGE
}

export function persistLanguage(language: Language): void {
  writePreference(LANGUAGE_STORAGE_KEY, language)
}

export function applyDocumentLanguage(language: Language): void {
  document.documentElement.lang = language
}
