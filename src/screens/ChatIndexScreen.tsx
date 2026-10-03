import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ScreenPlaceholder } from '../components/ScreenPlaceholder'

/**
 * Desktop empty state for `/app` — shown when no conversation is selected.
 */
export function ChatIndexScreen() {
  const { t } = useTranslation()

  return (
    <ScreenPlaceholder
      icon={MessageSquare}
      title={t('app.chatIndexEmpty')}
      description={t('app.pending')}
    />
  )
}
