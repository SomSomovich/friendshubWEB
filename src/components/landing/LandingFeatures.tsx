import {
  Ban,
  Layers,
  ShieldCheck,
  Smartphone,
  Users,
  WifiOff,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
import { Section } from './Section'

type Feature = {
  icon: LucideIcon
  titleKey: ParseKeys
  textKey: ParseKeys
}

/**
 * Only what the client actually does today: each claim here is backed by
 * something already built, which is why there is no card for calls or
 * attachments yet.
 */
const FEATURES: Feature[] = [
  { icon: ShieldCheck, titleKey: 'landing.features.encryption.title', textKey: 'landing.features.encryption.text' },
  { icon: Layers, titleKey: 'landing.features.accounts.title', textKey: 'landing.features.accounts.text' },
  { icon: Smartphone, titleKey: 'landing.features.devices.title', textKey: 'landing.features.devices.text' },
  { icon: WifiOff, titleKey: 'landing.features.offline.title', textKey: 'landing.features.offline.text' },
  { icon: Users, titleKey: 'landing.features.groups.title', textKey: 'landing.features.groups.text' },
  { icon: Ban, titleKey: 'landing.features.noTracking.title', textKey: 'landing.features.noTracking.text' },
]

export function LandingFeatures() {
  const { t } = useTranslation()

  return (
    <Section id="features" title={t('landing.features.title')} subtitle={t('landing.features.subtitle')}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, titleKey, textKey }) => (
          <li
            key={titleKey}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-bg-elevated p-5"
          >
            <Icon className="size-5 text-accent" aria-hidden />
            <h3 className="text-sm font-semibold text-fg">{t(titleKey)}</h3>
            <p className="text-sm text-pretty text-fg-muted">{t(textKey)}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}
