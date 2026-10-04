import { Copy, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { useToast } from '../../hooks/useToast'

export type BackupCodesProps = {
  codes: string[]
}

/**
 * The one-time view of a 2FA enrollment's backup codes.
 *
 * They are shown once by design, so the panel says so instead of letting the
 * visitor assume they can come back for them.
 */
export function BackupCodes({ codes }: BackupCodesProps) {
  const { t } = useTranslation()
  const toast = useToast()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 rounded-lg border border-danger bg-bg p-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
        <p className="text-xs text-pretty text-fg-muted">{t('twoFactorSetup.backupWarning')}</p>
      </div>

      <ul className="grid grid-cols-2 gap-1.5 font-mono text-xs text-fg">
        {codes.map((code) => (
          <li key={code} className="rounded-md bg-bg px-2 py-1.5 tracking-wide">
            {code}
          </li>
        ))}
      </ul>

      <Button
        variant="secondary"
        onClick={() => {
          void navigator.clipboard
            .writeText(codes.join('\n'))
            .then(() => {
              toast.notify({ kind: 'success', message: t('twoFactorSetup.copied') })
            })
            .catch((error: unknown) => {
              console.error('[settings] could not copy the backup codes', error)
              toast.notify({ kind: 'error', message: t('twoFactorSetup.copyFailed') })
            })
        }}
      >
        <Copy className="size-4" aria-hidden />
        {t('twoFactorSetup.copyAll')}
      </Button>
    </div>
  )
}
