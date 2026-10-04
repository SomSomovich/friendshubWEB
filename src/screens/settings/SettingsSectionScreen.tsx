import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../../components/layout/ScreenHeader'
import { ROUTES, type SettingsSection } from '../../router/paths'

export type SettingsSectionScreenProps = {
  section: SettingsSection
  children: ReactNode
}

/**
 * The frame every section shares: a titled header that leads back to the list,
 * and one scrolling column that keeps the panels a comfortable width on a
 * desktop without stretching them across it.
 */
export function SettingsSectionScreen({ section, children }: SettingsSectionScreenProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg text-fg">
      <ScreenHeader
        title={t(`settings.sections.${section}`)}
        onBack={() => {
          void navigate(ROUTES.settings)
        }}
        backMode="always"
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">{children}</div>
      </div>
    </div>
  )
}
