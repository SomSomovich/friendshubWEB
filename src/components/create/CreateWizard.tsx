import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../layout/ScreenHeader'
import { StepIndicator } from './StepIndicator'

export type CreateWizardProps = {
  title: string
  /** One translated label per step, in order. */
  stepLabels: string[]
  /** Zero-based index of the step on screen. */
  step: number
  /** Leaves the flow entirely, skipping the other steps. */
  onClose: () => void
  children: ReactNode
  /** The step's own buttons; each step asks for different ones. */
  footer: ReactNode
}

/**
 * The frame both creation flows share: a header, the step indicator, one screen
 * of content and a footer that belongs to the step.
 *
 * Only the frame is shared. What each step asks for and what its buttons say
 * differ enough that a single "next" would have to be configured away.
 */
export function CreateWizard({
  title,
  stepLabels,
  step,
  onClose,
  children,
  footer,
}: CreateWizardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg text-fg">
      <ScreenHeader
        title={title}
        onBack={() => {
          // Stepping back through the wizard is the screens' business; leaving it
          // is this one's.
          void navigate(-1)
        }}
        backLabel={t('common.back')}
        backMode="always"
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <StepIndicator labels={stepLabels} current={step} />
          {children}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border p-3">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors duration-150 hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {t('common.cancel')}
        </button>
        {footer}
      </div>
    </div>
  )
}
