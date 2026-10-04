import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../router/paths'

export type LandingHeroProps = {
  authenticated: boolean
}

export function LandingHero({ authenticated }: LandingHeroProps) {
  const { t } = useTranslation()

  return (
    <div id="top" className="mx-auto grid w-full max-w-5xl items-center gap-10 px-5 py-12 sm:py-16 lg:grid-cols-2 lg:gap-14">
      <div className="flex flex-col items-start gap-5">
        <h1 className="text-3xl font-semibold text-balance text-fg sm:text-4xl">
          {t('landing.hero.title')}
        </h1>
        <p className="max-w-prose text-base text-pretty text-fg-muted">
          {t('landing.hero.subtitle')}
        </p>
        <div className="flex flex-wrap gap-3">
          {authenticated ? (
            <Link
              to={ROUTES.app}
              className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-fg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t('landing.openApp')}
            </Link>
          ) : (
            <>
              <Link
                to={ROUTES.register}
                className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-fg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t('landing.hero.ctaPrimary')}
              </Link>
              <Link
                to={ROUTES.login}
                className="rounded-lg border border-border bg-bg-elevated px-5 py-3 text-sm font-semibold text-fg transition hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t('landing.hero.ctaSecondary')}
              </Link>
            </>
          )}
        </div>
      </div>

      <CipherMock />
    </div>
  )
}

/**
 * An abstract illustration of what the server sees.
 *
 * Built from blocks rather than a screenshot so it costs nothing to load, needs
 * no image asset, and cannot go stale as the UI changes.
 */
function CipherMock() {
  const { t } = useTranslation()

  return (
    <div
      role="img"
      aria-label={t('landing.hero.mockLabel')}
      className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-border bg-bg-elevated p-5 shadow-sm"
    >
      <div className="flex items-end gap-2">
        <div className="size-8 shrink-0 rounded-full bg-bg-hover" />
        <div className="h-10 w-40 rounded-2xl rounded-bl-sm bg-bg-hover" />
      </div>

      <div className="flex justify-end">
        <div className="h-10 w-32 rounded-2xl rounded-br-sm bg-accent" />
      </div>

      <div className="mt-1 rounded-xl border border-dashed border-border bg-bg p-3 font-mono text-[10px] leading-relaxed break-all text-fg-muted">
        3a7f9c01 8f2b44d0 5e11a7c3 0d6f8b2a
      </div>
    </div>
  )
}
