import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ScreenHeader } from '../components/layout/ScreenHeader'
import { EmptyState } from '../components/ui/EmptyState'
import { useActiveAccount } from '../hooks/useActiveAccount'
import { ROUTES } from '../router/paths'
import { getExistingAccountStore } from '../state/accountRegistry'

/**
 * The open conversation.
 *
 * 4.1 gives it the part that belongs to the shell — the header and the mobile
 * back button — and an honest placeholder body. The message list, composer and
 * everything else arrive in 4.5.
 *
 * The title is read once rather than subscribed to: nothing changes it yet, and
 * the reactive version belongs with the real view.
 */
export function ChatScreen() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const account = useActiveAccount()

  const store = account === null ? undefined : getExistingAccountStore(account.id)
  const conversation =
    id === undefined ? undefined : store?.getState().conversations.find((entry) => entry.id === id)

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <ScreenHeader
        title={conversation?.title ?? id ?? t('chat.title')}
        subtitle={t('chat.pendingStatus')}
        onBack={() => {
          void navigate(ROUTES.app)
        }}
        backLabel={t('chat.back')}
      />

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <EmptyState
          icon={MessageSquare}
          title={t('chat.pending')}
          description={t('chat.pendingHint')}
        />
      </div>
    </div>
  )
}
