import { Megaphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/layout/ScreenHeader'
import { EmptyState } from '../components/ui/EmptyState'
import { ROUTES } from '../router/paths'

/** The creation flow (info, linked discussion group, confirm) arrives in 4.7. */
export function CreateChannelScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg text-fg">
      <ScreenHeader
        title={t('menu.createChannel')}
        onBack={() => {
          void navigate(ROUTES.app)
        }}
        backMode="always"
      />
      <div className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={Megaphone}
          title={t('createChannel.pending')}
          description={t('createChannel.pendingHint')}
        />
      </div>
    </div>
  )
}
