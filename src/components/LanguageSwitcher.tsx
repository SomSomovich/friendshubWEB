import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  type Language,
} from '../i18n/language'
import { cn } from '../utils/cn'

const LANGUAGE_LABELS = {
  ru: 'settings.languageRu',
  en: 'settings.languageEn',
} as const satisfies Record<Language, string>

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const active = normalizeLanguage(i18n.language) ?? DEFAULT_LANGUAGE

  return (
    <div
      role="group"
      aria-label={t('settings.language')}
      className="flex items-center gap-1 rounded-xl border border-border p-1"
    >
      <Languages className="mx-1 size-4 text-fg-muted" aria-hidden />
      {SUPPORTED_LANGUAGES.map((value) => {
        const isActive = value === active

        return (
          <button
            key={value}
            type="button"
            // i18next persists the choice and updates <html lang> via its
            // `languageChanged` listener (see src/i18n/index.ts).
            onClick={() => {
              void i18n.changeLanguage(value)
            }}
            aria-pressed={isActive}
            title={t(LANGUAGE_LABELS[value])}
            className={cn(
              'cursor-pointer rounded-lg px-2 py-1 text-xs font-medium uppercase transition-colors',
              isActive
                ? 'bg-accent text-accent-fg'
                : 'text-fg-muted hover:bg-bg-hover hover:text-fg',
            )}
          >
            {value}
          </button>
        )
      })}
    </div>
  )
}
