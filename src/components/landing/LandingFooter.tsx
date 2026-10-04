import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../LanguageSwitcher'
import { ThemeSwitcher } from '../ThemeSwitcher'

/** The repository, for anyone who wants to check the claims above. */
const REPOSITORY_URL = 'https://github.com/SomSomovich/friendshubWEB'

export function LandingFooter() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-5 py-8">
        <div className="flex flex-wrap items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-muted">
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-fg"
          >
            {t('landing.footer.repository')}
          </a>
          <span>{t('landing.footer.license')}</span>
          <span className="ml-auto">
            © {year} {t('common.appName')}. {t('landing.footer.rights')}
          </span>
        </div>
      </div>
    </footer>
  )
}
