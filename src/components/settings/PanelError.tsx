import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'

/**
 * A settings panel that could not be read, and the way to try again.
 *
 * The alternative — leaving the skeleton up — is the worst of the three states:
 * it looks like slow loading forever, and the reader has no way to tell a dead
 * request from a slow one, nor to ask for it again. The server's own message is
 * shown rather than an invented one, because "not found" and "connection refused"
 * are different problems and the server knows which it is.
 */
export function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation()

  return (
    <div role="alert" className="flex flex-col items-start gap-2">
      <p className="text-xs text-pretty text-fg-muted">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t('common.retry')}
      </Button>
    </div>
  )
}
