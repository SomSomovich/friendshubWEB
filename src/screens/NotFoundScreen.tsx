import { Compass } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ROUTES } from '../router/paths'

export function NotFoundScreen() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <Compass className="size-10 text-accent" aria-hidden />
      <h1 className="text-lg font-semibold">{t('notFound.title')}</h1>
      <p className="text-sm text-fg-muted">{t('notFound.description')}</p>
      <Link
        to={ROUTES.landing}
        className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-fg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {t('notFound.home')}
      </Link>
    </div>
  )
}
