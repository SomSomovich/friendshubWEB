import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  applyDocumentLanguage,
  normalizeLanguage,
  persistLanguage,
  resolveInitialLanguage,
} from './language'
import ru from './ru.json'

/**
 * Keeps `<html lang>` and the stored preference in sync with i18next no matter
 * where the language was changed from. Registered before `init()` so the
 * language selected during initialization is handled as well.
 */
i18n.on('languageChanged', (language: string) => {
  const resolved = normalizeLanguage(language) ?? DEFAULT_LANGUAGE
  applyDocumentLanguage(resolved)
  persistLanguage(resolved)
})

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
    },
    lng: resolveInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    defaultNS: 'translation',
    // React escapes interpolated values itself.
    interpolation: { escapeValue: false },
    react: {
      // Resources are bundled, so there is nothing to wait for; suspending would
      // only add a fallback flash on first render.
      useSuspense: false,
    },
  })
  .catch((error: unknown) => {
    console.error('[i18n] initialization failed', error)
  })
