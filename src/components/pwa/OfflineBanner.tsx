import { WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useOnline } from '../../hooks/useOnline'

/**
 * The strip that appears when the browser loses its network.
 *
 * It says what will happen to a message written now, because that is the only
 * question the reader has: nothing is lost, it leaves when the connection does.
 */
export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useOnline()

  if (online) {
    return null
  }

  return (
    <div
      role="status"
      className="flex shrink-0 items-center gap-2 border-b border-border bg-bg-elevated px-3 py-2 text-xs text-fg"
    >
      <WifiOff className="size-4 shrink-0 text-fg-muted" aria-hidden />
      <span className="text-pretty">{t('pwa.offline')}</span>
    </div>
  )
}
