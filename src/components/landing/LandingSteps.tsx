import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Section } from './Section'

const STEPS: Array<{ titleKey: ParseKeys; textKey: ParseKeys }> = [
  { titleKey: 'landing.how.step1.title', textKey: 'landing.how.step1.text' },
  { titleKey: 'landing.how.step2.title', textKey: 'landing.how.step2.text' },
  { titleKey: 'landing.how.step3.title', textKey: 'landing.how.step3.text' },
]

export function LandingSteps() {
  const { t } = useTranslation()

  return (
    <Section id="how" title={t('landing.how.title')} subtitle={t('landing.how.subtitle')}>
      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li
            key={step.titleKey}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-bg-elevated p-5"
          >
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-fg"
            >
              {index + 1}
            </span>
            <h3 className="text-sm font-semibold text-fg">{t(step.titleKey)}</h3>
            <p className="text-sm text-pretty text-fg-muted">{t(step.textKey)}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
