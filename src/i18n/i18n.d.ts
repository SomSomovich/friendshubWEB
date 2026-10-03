import type ru from './ru.json'

/**
 * Makes `t()` reject keys that do not exist in the Russian locale — the
 * canonical one. `src/i18n/en.json` must mirror its shape exactly.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: typeof ru
    }
  }
}
