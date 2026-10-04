import { Code, KeyRound, Lock, Rocket, type LucideIcon } from 'lucide-react'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Section } from './Section'

const POINTS: Array<{ icon: LucideIcon; titleKey: ParseKeys; textKey: ParseKeys }> = [
  { icon: Lock, titleKey: 'landing.why.privacy.title', textKey: 'landing.why.privacy.text' },
  { icon: KeyRound, titleKey: 'landing.why.control.title', textKey: 'landing.why.control.text' },
  { icon: Code, titleKey: 'landing.why.open.title', textKey: 'landing.why.open.text' },
  { icon: Rocket, titleKey: 'landing.why.fast.title', textKey: 'landing.why.fast.text' },
]

export function LandingWhy() {
  const { t } = useTranslation()

  return (
    <Section id="why" title={t('landing.why.title')}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {POINTS.map(({ icon: Icon, titleKey, textKey }) => (
          <li key={titleKey} className="flex items-start gap-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-fg">{t(titleKey)}</h3>
              <p className="text-sm text-pretty text-fg-muted">{t(textKey)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
