import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { ROUTES } from '../router/paths'

export function PublicLandingScreen() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-end gap-2 px-4 py-4">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-16 text-center">
        {/* The logo has a light and a dark variant; exactly one is rendered. */}
        <div
          role="img"
          aria-label={t('common.appName')}
          className="flex items-center justify-center"
        >
          <img
            src="/branding/logo_white.webp"
            alt=""
            className="hidden h-24 w-auto dark:block"
          />
          <img
            src="/branding/logo_black.webp"
            alt=""
            className="block h-24 w-auto dark:hidden"
          />
        </div>

        <div className="flex max-w-md flex-col gap-3">
          <h1 className="text-2xl font-semibold text-balance">
            {t('common.tagline')}
          </h1>
          <p className="text-sm text-pretty text-fg-muted">
            {t('landing.phaseNote')}
          </p>
        </div>

        <nav className="flex w-full max-w-xs flex-col gap-3">
          <Link
            to={ROUTES.login}
            className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-fg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t('landing.login')}
          </Link>
          <Link
            to={ROUTES.register}
            className="rounded-xl border border-border bg-bg-elevated px-5 py-3 text-sm font-semibold text-fg transition hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t('landing.register')}
          </Link>
        </nav>
      </main>
    </div>
  )
}
