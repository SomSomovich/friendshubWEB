import { UserRoundPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { joinByInvite } from '../api/groups'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { useActiveAccount } from '../hooks/useActiveAccount'
import { useToast } from '../hooks/useToast'
import { chatPath, ROUTES } from '../router/paths'
import { requireAccountStore } from '../state/accountRegistry'

/**
 * Where an invite link lands.
 *
 * The token is spent by a POST, not by rendering the page — a page that joins on
 * GET would be joined by anything that prefetches links, including the messenger
 * the link was pasted into. A visitor without a session is sent to the sign-in
 * flow first and comes back here, which is what `RequireAuth`'s `from` is for.
 */
export function JoinInviteScreen() {
  const { token } = useParams<{ token: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const account = useActiveAccount()

  const [failed, setFailed] = useState(false)
  /** Survives React's development remount, so the news is shown once. */
  const announcedRef = useRef(false)

  useEffect(() => {
    if (account === null || token === undefined) {
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const conversationId = await joinByInvite(account, token)
        // The list is drawn from the store, and a group nobody has heard of
        // would open as "chat not found".
        await requireAccountStore(account.id).getState().actions.loadConversations()
        if (announcedRef.current) {
          return
        }
        announcedRef.current = true
        toast.notify({ kind: 'success', message: t('conversation.join.joined') })
        void navigate(chatPath(conversationId), { replace: true })
      } catch (cause) {
        // The server's own words for this are "not found" or "invite
        // exhausted", which explain nothing to the person holding the link. The
        // screen says what the two of them mean together; the cause is logged.
        console.warn('[invite] the link could not be used', cause)
        if (!cancelled) {
          setFailed(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [account, token, navigate, toast, t])

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-bg text-fg">
      {!failed ? (
        <div className="flex flex-col items-center gap-3" role="status">
          <Spinner className="size-6 text-fg-muted" />
          <p className="text-sm text-fg-muted">{t('conversation.join.joining')}</p>
        </div>
      ) : (
        <EmptyState
          icon={UserRoundPlus}
          title={t('conversation.join.failed')}
          description={t('conversation.join.failedHint')}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void navigate(ROUTES.app, { replace: true })
              }}
            >
              {t('conversation.join.toChats')}
            </Button>
          }
        />
      )}
    </div>
  )
}
