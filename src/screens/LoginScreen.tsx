import { LogIn } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ScreenPlaceholder } from '../components/ScreenPlaceholder'
import { ROUTES } from '../router/paths'

export function LoginScreen() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 flex-col">
      <ScreenPlaceholder
        icon={LogIn}
        title={t('auth.loginTitle')}
        description={t('auth.pending', { screen: t('auth.loginTitle') })}
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
