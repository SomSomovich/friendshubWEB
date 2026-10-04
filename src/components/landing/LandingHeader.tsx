import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../router/paths'

export type LandingHeaderProps = {
  /** A signed-in visitor gets one button into the app instead of two. */
  authenticated: boolean
}

/**
 * Logo, section links and the primary call to action.
 *
 * The theme and language switchers live in the footer: on a 320px screen the
 * header cannot hold them and two buttons without crowding, and the footer is
 * reachable from anywhere on the page.
 */
export function LandingHeader({ authenticated }: LandingHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-5 py-3">
        <a href="#top" className="flex shrink-0 items-center">
          <img src="/branding/logo_white.webp" alt="" className="hidden h-7 w-auto dark:block" />
          <img src="/branding/logo_black.webp" alt="" className="block h-7 w-auto dark:hidden" />
          <span className="sr-only">{t('common.appName')}</span>
        </a>

        <nav
          aria-label={t('landing.navLabel')}
          className="hidden flex-1 items-center gap-5 md:flex"
        >
          <a href="#features" className="text-sm text-fg-muted transition-colors hover:text-fg">
            {t('landing.nav.features')}
          </a>
          <a href="#how" className="text-sm text-fg-muted transition-colors hover:text-fg">
            {t('landing.nav.how')}
          </a>
          <a href="#why" className="text-sm text-fg-muted transition-colors hover:text-fg">
            {t('landing.nav.why')}
          </a>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {authenticated ? (
            <Link
              to={ROUTES.app}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t('landing.openApp')}
            </Link>
          ) : (
            <>
              <Link
                to={ROUTES.login}
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-bg-hover sm:block"
              >
                {t('landing.login')}
              </Link>
              <Link
                to={ROUTES.register}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t('landing.register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
