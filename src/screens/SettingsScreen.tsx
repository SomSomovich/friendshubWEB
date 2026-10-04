import { Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/layout/ScreenHeader'
import { EmptyState } from '../components/ui/EmptyState'
import { ROUTES } from '../router/paths'

/**
 * Settings: the shell is here (header and a way back), the sections arrive in
 * 4.6 — theme, language, privacy, security, notifications, accounts.
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
      <div className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={Settings}
          title={t('settings.pending')}
          description={t('settings.pendingHint')}
        />
      </div>
    </div>
  )
}
