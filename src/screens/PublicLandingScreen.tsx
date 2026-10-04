import { useTranslation } from 'react-i18next'
import { LandingFeatures } from '../components/landing/LandingFeatures'
import { LandingFooter } from '../components/landing/LandingFooter'
import { LandingHeader } from '../components/landing/LandingHeader'
import { LandingHero } from '../components/landing/LandingHero'
import { LandingSteps } from '../components/landing/LandingSteps'
import { LandingWhy } from '../components/landing/LandingWhy'
import { useActiveAccount } from '../hooks/useActiveAccount'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

/**
 * The public page.
 *
 * Outside both route guards on purpose: it is what a search engine and a
 * first-time visitor see, and a signed-in visitor still finds it useful — every
 * call to action becomes "Open the app".
 */
export function PublicLandingScreen() {
  const { t } = useTranslation()
  const account = useActiveAccount()
  const authenticated = account !== null

  useDocumentMeta(t('landing.hero.title'), t('landing.hero.subtitle'))

  return (
    <div className="flex min-h-full flex-col bg-bg text-fg">
      <LandingHeader authenticated={authenticated} />
      <main className="flex-1">
        <LandingHero authenticated={authenticated} />
        <LandingFeatures />
        <LandingSteps />
        <LandingWhy />
      </main>
      <LandingFooter />
    </div>
  )
}
