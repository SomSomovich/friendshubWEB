import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '../components/ui/EmptyState'

/**
 * The desktop state of `/app` with no conversation selected.
 *
 * On mobile this panel is hidden entirely — the list fills the screen — so this
 * is only ever seen from `md` up.
 */
export function ChatIndexScreen() {
  const { t } = useTranslation()

  return (
    <div className="hidden min-h-0 flex-1 items-center justify-center bg-bg md:flex">
      <EmptyState
        icon={MessageSquare}
        title={t('app.chatIndexEmpty')}
        description={t('app.chatIndexHint')}
      />
    </div>
  )
}
