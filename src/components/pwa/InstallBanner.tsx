import { Smartphone, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { rememberInstallDismissal, useInstallPrompt } from '../../hooks/useInstallPrompt'
import { Button } from '../ui/Button'

/**
 * The invitation to install the app, at the bottom of the shell.
 *
 * One banner covers both cases — Chrome's dialog and Safari's manual gesture —
 * because to the reader they are the same offer with different instructions.
 */
export function InstallBanner() {
  const { t } = useTranslation()
  const install = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || install.kind === 'hidden') {
    return null
  }

  function dismiss(): void {
    rememberInstallDismissal()
    setDismissed(true)
  }

  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-border bg-bg-elevated p-3">
      <Smartphone className="size-5 shrink-0 text-accent" aria-hidden />

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-sm text-fg">{t('pwa.install.title')}</p>
        <p className="text-xs text-pretty text-fg-muted">
          {install.kind === 'ios' ? t('pwa.install.ios') : t('pwa.install.hint')}
        </p>
      </div>

      {install.kind === 'available' ? (
        <Button size="sm" onClick={install.install}>
          {t('pwa.install.action')}
        </Button>
      ) : null}

      <button
        type="button"
        onClick={dismiss}
        aria-label={t('pwa.install.dismiss')}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
