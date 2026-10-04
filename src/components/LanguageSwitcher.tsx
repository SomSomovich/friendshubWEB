import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type Language } from '../i18n/language'
import { useUiStore } from '../state/uiStore'
import { cn } from '../utils/cn'

const LANGUAGE_LABELS = {
  ru: 'settings.languageRu',
  en: 'settings.languageEn',
} as const satisfies Record<Language, string>

/**
 * Language is owned by the UI store — it persists the choice, updates
 * `<html lang>` and switches i18next — so this component only reads the active
 * value and asks the store to change it.
 */
export function LanguageSwitcher() {
  const { t } = useTranslation()
  const language = useUiStore((state) => state.language)
  const setLanguage = useUiStore((state) => state.setLanguage)

  return (
    <div
      role="group"
      aria-label={t('settings.language')}
      className="flex items-center gap-1 rounded-xl border border-border p-1"
    >
      <Languages className="mx-1 size-4 text-fg-muted" aria-hidden />
      {SUPPORTED_LANGUAGES.map((value) => {
        const isActive = value === language

        return (
          <button
            key={value}
            type="button"
            onClick={() => {
              setLanguage(value)
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
