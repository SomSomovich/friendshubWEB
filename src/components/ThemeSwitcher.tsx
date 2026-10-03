import { Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../hooks/useTheme'
import { THEMES, type Theme } from '../theme/theme'
import { cn } from '../utils/cn'

const THEME_LABELS = {
  dark: 'settings.themeDark',
  light: 'settings.themeLight',
} as const satisfies Record<Theme, string>

const THEME_ICONS: Record<Theme, ReactNode> = {
  dark: <Moon className="size-4" aria-hidden />,
  light: <Sun className="size-4" aria-hidden />,
}

export function ThemeSwitcher() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label={t('settings.theme')}
      className="flex items-center gap-1 rounded-xl border border-border p-1"
    >
      {THEMES.map((value) => {
        const isActive = value === theme
        const label = t(THEME_LABELS[value])

        return (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTheme(value)
            }}
            aria-pressed={isActive}
            title={label}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-fg'
                : 'text-fg-muted hover:bg-bg-hover hover:text-fg',
            )}
          >
            {THEME_ICONS[value]}
            <span className="sr-only sm:not-sr-only">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
