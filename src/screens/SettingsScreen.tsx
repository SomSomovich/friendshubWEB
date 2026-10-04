import {
  Bell,
  Info,
  Palette,
  ShieldCheck,
  UserRound,
  UserRoundCog,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { SettingsNavRow } from '../components/settings/Section'
import { ScreenHeader } from '../components/layout/ScreenHeader'
import { ROUTES, settingsPath, type SettingsSection } from '../router/paths'

/** The index of the settings sections, in the order the brief lists them. */
const SECTIONS: ReadonlyArray<{ id: SettingsSection; icon: LucideIcon; labelKey: ParseKeys }> = [
  { id: 'account', icon: UserRound, labelKey: 'settings.sections.account' },
  { id: 'appearance', icon: Palette, labelKey: 'settings.sections.appearance' },
  { id: 'privacy', icon: Users, labelKey: 'settings.sections.privacy' },
  { id: 'security', icon: ShieldCheck, labelKey: 'settings.sections.security' },
  { id: 'notifications', icon: Bell, labelKey: 'settings.sections.notifications' },
  { id: 'accounts', icon: UserRoundCog, labelKey: 'settings.sections.accounts' },
  { id: 'about', icon: Info, labelKey: 'settings.sections.about' },
]

/**
 * Settings.
 *
 * A list of sections rather than panels stacked on one page: below `md` a single
 * column of everything would be a scroll nobody finishes, and each section is
 * deep enough to deserve a screen with a back button.
 */
export function SettingsScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg text-fg">
      <ScreenHeader
        title={t('settings.title')}
        onBack={() => {
          void navigate(ROUTES.app)
        }}
        backMode="always"
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <nav className="mx-auto flex w-full max-w-xl flex-col gap-2">
          {SECTIONS.map((section) => (
            <SettingsNavRow
              key={section.id}
              to={settingsPath(section.id)}
              label={t(section.labelKey)}
              description={t(`settings.hints.${section.id}`)}
              icon={section.icon}
            />
          ))}
        </nav>
      </div>
    </div>
  )
}
