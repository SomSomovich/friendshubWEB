import { HelpCircle, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsCard, SettingsChoice } from '../../components/settings/Section'
import { useTheme } from '../../hooks/useTheme'
import { SUPPORTED_LANGUAGES } from '../../i18n/language'
import { useUiStore } from '../../state/uiStore'
import { colorDistance, defaultCustomColors, type CustomColors, type RgbColor, THEMES } from '../../theme/theme'
import { Button } from '../../components/ui/Button'
import { SettingsSectionScreen } from './SettingsSectionScreen'

/** Theme and interface language — the two preferences the whole app reads. */
export function AppearanceSettingsScreen() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const language = useUiStore((state) => state.language)
  const setLanguage = useUiStore((state) => state.setLanguage)
  const customColors = useUiStore((state) => state.customColors)
  const setCustomColors = useUiStore((state) => state.setCustomColors)
  const resetCustomColors = useUiStore((state) => state.resetCustomColors)
  const [draft, setDraft] = useState<CustomColors>(() => customColors ?? defaultCustomColors(theme))
  const contrast = colorDistance(draft.background, draft.text)
  const valid = contrast >= 20

  function updateColor(key: keyof CustomColors, color: RgbColor): void {
    setDraft((current) => ({ ...current, [key]: color }))
  }

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

      <SettingsCard title={t('settings.customColors')} description={t('settings.customColorsHint')}>
        <ColorHelp label={t('settings.customColorsHelpLabel')} text={t('settings.customColorsHelp')} />

        <RgbColorField label={t('settings.customColorsBackground')} color={draft.background} onChange={(color) => updateColor('background', color)} />
        <RgbColorField label={t('settings.customColorsButton')} color={draft.button} onChange={(color) => updateColor('button', color)} />
        <RgbColorField label={t('settings.customColorsBubble')} color={draft.bubble} onChange={(color) => updateColor('bubble', color)} />
        <RgbColorField label={t('settings.customColorsText')} color={draft.text} onChange={(color) => updateColor('text', color)} />

        <p className={valid ? 'text-xs text-fg-muted' : 'text-xs text-danger'} aria-live="polite">
          {valid ? t('settings.customColorsContrast', { value: contrast }) : t('settings.customColorsContrastError', { value: contrast })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!valid} onClick={() => setCustomColors(draft)}>{t('settings.customColorsApply')}</Button>
          {customColors === null ? null : (
            <Button variant="secondary" onClick={() => { resetCustomColors(); setDraft(defaultCustomColors(theme)) }}>
              <RotateCcw className="size-4" aria-hidden />
              {t('settings.customColorsReset')}
            </Button>
          )}
        </div>
      </SettingsCard>
    </SettingsSectionScreen>
  )
}

function ColorHelp({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex items-center rounded-lg border border-border bg-bg p-3 text-xs text-fg-muted">
      <button
        type="button"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="flex size-7 cursor-pointer items-center justify-center rounded-full text-accent hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <HelpCircle className="size-5" aria-hidden />
      </button>
      {open ? <div role="tooltip" className="absolute top-full left-0 z-10 mt-2 w-[min(22rem,calc(100vw-3rem))] rounded-lg border border-border bg-bg-elevated p-3 text-pretty text-xs text-fg shadow-lg">{text}</div> : null}
    </div>
  )
}

function RgbColorField({ label, color, onChange }: { label: string; color: RgbColor; onChange: (color: RgbColor) => void }) {
  const hex = `#${[color.r, color.g, color.b].map((value) => value.toString(16).padStart(2, '0')).join('')}`
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <label className="flex items-center gap-2 text-sm text-fg">
        <input type="color" value={hex} aria-label={label} onChange={(event) => {
          const value = event.target.value.slice(1)
          onChange({ r: Number.parseInt(value.slice(0, 2), 16), g: Number.parseInt(value.slice(2, 4), 16), b: Number.parseInt(value.slice(4, 6), 16) })
        }} className="size-8 cursor-pointer rounded border border-border bg-transparent p-0.5" />
        <span>{label}</span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {(['r', 'g', 'b'] as const).map((channel) => (
          <label key={channel} className="flex min-w-0 flex-col gap-1 text-[11px] text-fg-muted">
            <span className="uppercase">{channel}</span>
            <input
              type="number"
              min={0}
              max={255}
              value={color[channel]}
              aria-label={`${label} ${channel.toUpperCase()}`}
              onChange={(event) => {
                const next = Number(event.target.value)
                if (Number.isFinite(next)) onChange({ ...color, [channel]: Math.max(0, Math.min(255, Math.round(next))) })
              }}
              className="h-9 w-full rounded-lg border border-border bg-bg px-2 text-sm text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            />
          </label>
        ))}
      </div>
    </div>
  )
}
