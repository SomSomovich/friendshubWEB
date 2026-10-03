import { UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ScreenPlaceholder } from '../components/ScreenPlaceholder'
import { ROUTES } from '../router/paths'

export function RegisterScreen() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 flex-col">
      <ScreenPlaceholder
        icon={UserPlus}
        title={t('auth.registerTitle')}
        description={t('auth.pending', { screen: t('auth.registerTitle') })}
      >
        <Link
          to={ROUTES.landing}
          className="text-sm font-medium text-accent hover:underline"
        >
          {t('common.back')}
        </Link>
      </ScreenPlaceholder>
    </div>
  )
}
