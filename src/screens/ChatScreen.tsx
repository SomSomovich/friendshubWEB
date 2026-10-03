import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { ScreenPlaceholder } from '../components/ScreenPlaceholder'

export function ChatScreen() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()

  return (
    <ScreenPlaceholder
      icon={MessageSquare}
      title={t('app.chatTitle')}
      description={t('app.pending')}
    >
      {id ? (
        <p className="text-xs text-fg-muted">
          conversation_id: <code className="break-all">{id}</code>
        </p>
      ) : null}
    </ScreenPlaceholder>
  )
}
