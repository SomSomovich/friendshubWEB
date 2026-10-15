import { Phone, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { clearCallHistory, deleteCall, listCalls, type CallRecord } from '../api/webrtc'
import { startCall } from '../calls/manager'
import { formatCallDuration } from '../calls/duration'
import { ScreenHeader } from '../components/layout/ScreenHeader'
import { PanelError } from '../components/settings/PanelError'
import { PanelSkeleton } from '../components/settings/PanelSkeleton'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { avatarImageUrl } from '../api/avatars'
import { useAccountResource } from '../hooks/useAccountResource'
import { useActionReporter } from '../hooks/useActionReporter'
import { useActiveAccount } from '../hooks/useActiveAccount'
import { useSenderNames } from '../hooks/useSenderNames'
import { ROUTES } from '../router/paths'
import { useUiStore } from '../state/uiStore'
import type { Account } from '../types'
import { formatFullTimestamp } from '../utils/chatTime'

const loadCalls = (account: Account) => listCalls(account, { limit: 200 })
export function CallHistoryScreen() {
  const account = useActiveAccount()
  return account === null ? null : <CallHistory key={account.id} account={account} />
}
function CallHistory({ account }: { account: Account }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const fail = useActionReporter('call-history')
  const resource = useAccountResource(account, loadCalls)
  const names = useSenderNames(account, [...new Set((resource.data ?? []).map((call) => call.peerAccountId))])
  const openProfile = useUiStore((state) => state.openProfile)
  const [confirm, setConfirm] = useState<CallRecord | 'all' | null>(null)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  async function remove(): Promise<void> {
    if (submitting.current || confirm === null || resource.data === null) return
    submitting.current = true
    setBusy(true)
    try {
      if (confirm === 'all') { await clearCallHistory(account); resource.replace([]) }
      else { await deleteCall(account, confirm.id); resource.replace(resource.data.filter((call) => call.id !== confirm.id)) }
      setConfirm(null)
    } catch (cause) { fail(cause) }
    finally { submitting.current = false; setBusy(false) }
  }
  return <div className="flex min-h-0 flex-1 flex-col bg-bg text-fg">
    <ScreenHeader title={t('callHistory.title')} onBack={() => { void navigate(ROUTES.app) }} backMode="always" />
    <div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="mx-auto flex w-full max-w-xl flex-col gap-3">
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="secondary" size="sm" disabled={busy} onClick={resource.reload}>{t('conversation.management.refresh')}</Button>
        <Button variant="danger" size="sm" disabled={busy || !resource.data?.length} onClick={() => setConfirm('all')}>{t('callHistory.clear')}</Button>
      </div>
      <p className="text-xs text-fg-muted">{t('callHistory.hint')}</p>
      {resource.error !== null ? <PanelError message={resource.error} onRetry={resource.reload} />
        : resource.data === null ? <PanelSkeleton rows={4} /> : resource.data.length === 0
          ? <EmptyState icon={Phone} title={t('callHistory.empty')} />
          : <ul className="flex flex-col gap-2">{resource.data.map((call) => {
            const name = names.get(call.peerAccountId) ?? t('chatList.unknownPeer')
            return <li key={call.id} className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated p-3">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-accent"
                onClick={() => openProfile(call.peerAccountId)}>
                <Avatar name={name} src={avatarImageUrl(call.peerAccountId)} size="md" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm text-fg">{name}</span>
                  <span className="text-xs text-fg-muted">{t(`callHistory.${call.direction}`)} · {t(`callHistory.status.${call.status}`)}</span>
                  <span className="text-xs text-fg-muted">{formatFullTimestamp(call.startedAt, i18n.language)}{call.status === 'completed' ? ` · ${formatCallDuration(call.endedAt - call.startedAt)}` : ''}</span>
                </span>
              </button>
              <Button variant="ghost" size="sm" aria-label={t('call.audio')} onClick={() => {
                void startCall(account, { peerAccountId: call.peerAccountId, peerName: name, conversationId: null, withVideo: false })
              }}><Phone className="size-4" aria-hidden /></Button>
              <Button variant="ghost" size="sm" disabled={busy} aria-label={t('callHistory.delete')} onClick={() => setConfirm(call)}><Trash2 className="size-4" aria-hidden /></Button>
            </li>
          })}</ul>}
    </div></div>
    <ConfirmDialog open={confirm !== null} danger busy={busy}
      title={t(confirm === 'all' ? 'callHistory.clear' : 'callHistory.delete')}
      description={t(confirm === 'all' ? 'callHistory.clearHint' : 'callHistory.deleteHint')}
      confirmLabel={t('conversation.management.confirmDelete')} onConfirm={() => { void remove() }}
      onClose={() => { if (!submitting.current) setConfirm(null) }} />
  </div>
}
