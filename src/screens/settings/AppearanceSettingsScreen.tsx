import { useTranslation } from 'react-i18next'
import { SettingsCard, SettingsChoice } from '../../components/settings/Section'
import { useTheme } from '../../hooks/useTheme'
import { SUPPORTED_LANGUAGES } from '../../i18n/language'
import { useUiStore } from '../../state/uiStore'
import { THEMES } from '../../theme/theme'
import { SettingsSectionScreen } from './SettingsSectionScreen'

/** Theme and interface language — the two preferences the whole app reads. */
export function AppearanceSettingsScreen() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const language = useUiStore((state) => state.language)
  const setLanguage = useUiStore((state) => state.setLanguage)

  return (
    <SettingsSectionScreen section="appearance">
      <SettingsCard title={t('settings.theme')}>
        <SettingsChoice
          label={t('settings.theme')}
          value={theme}
          onChange={setTheme}
          options={THEMES.map((value) => ({
            value,
            label: value === 'dark' ? t('settings.themeDark') : t('settings.themeLight'),
          }))}
        />
      </SettingsCard>

      <SettingsCard title={t('settings.language')}>
        <SettingsChoice
          label={t('settings.language')}
          value={language}
          onChange={setLanguage}
          options={SUPPORTED_LANGUAGES.map((value) => ({
            value,
            label: value === 'ru' ? t('settings.languageRu') : t('settings.languageEn'),
          }))}
        />
      </SettingsCard>
    </SettingsSectionScreen>
  )
}
