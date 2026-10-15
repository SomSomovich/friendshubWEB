import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { deleteChannel, transferChannelOwnership } from '../../api/channels'
import { deleteGroup, transferGroupOwnership } from '../../api/groups'
import type { ConversationMember } from '../../hooks/useConversationMembers'
import { memberKey } from '../../hooks/useMemberLabels'
import { useActionReporter } from '../../hooks/useActionReporter'
import { requireAccountStore } from '../../state/accountRegistry'
import { deleteConversationLocally } from '../../storage/conversations'
import type { Account } from '../../types'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { SettingsCard } from '../settings/Section'

export function ConversationOwnershipPanel({ account, conversationId, kind, members, labels, onChanged, onDeleted }: {
  account: Account; conversationId: string; kind: 'group' | 'channel'; members: ConversationMember[]
  labels: Map<string, string>; onChanged: () => void; onDeleted: () => void
}) {
  const { t } = useTranslation()
  const fail = useActionReporter('conversation-owner')
  const [target, setTarget] = useState('')
  const [confirm, setConfirm] = useState<'transfer' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const candidates = members.filter((member) => member.actorType === 'account' && member.id !== account.id)
  const candidate = candidates.find((member) => member.id === target)
  async function execute(): Promise<void> {
    if (submitting.current || confirm === null || (confirm === 'transfer' && candidate === undefined)) return
    submitting.current = true
    setBusy(true)
    try {
      if (confirm === 'transfer') {
        await (kind === 'group' ? transferGroupOwnership : transferChannelOwnership)(account, conversationId, target)
        setConfirm(null)
        onChanged()
      } else {
        await (kind === 'group' ? deleteGroup : deleteChannel)(account, conversationId)
        await deleteConversationLocally(account.id, conversationId).catch((cause: unknown) => { console.warn('[conversation] local cleanup failed after deletion', cause) })
        await requireAccountStore(account.id).getState().actions.loadConversations()
        onDeleted()
      }
    } catch (cause) { fail(cause) }
    finally { submitting.current = false; setBusy(false) }
  }
  return <>
    <SettingsCard title={t('conversation.management.ownership')}>
      <label className="flex flex-col gap-1 text-xs font-medium text-fg-muted">
        {t('conversation.management.newOwner')}
        <select value={target} disabled={busy} onChange={(event) => setTarget(event.target.value)}
          className="h-10 w-full min-w-0 rounded-lg border border-border bg-bg px-3 text-sm text-fg focus-visible:outline-2 focus-visible:outline-accent">
          <option value="">{t('conversation.management.pickOwner')}</option>
          {candidates.map((member) => <option key={member.id} value={member.id}>{labels.get(memberKey(member)) ?? t('chatList.unknownPeer')}</option>)}
        </select>
      </label>
      <Button className="self-start" variant="secondary" size="sm" disabled={busy || candidate === undefined} onClick={() => setConfirm('transfer')}>{t('conversation.management.transfer')}</Button>
      <div className="border-t border-border pt-3">
        <Button variant="danger" size="sm" disabled={busy} onClick={() => setConfirm('delete')}>{t(kind === 'group' ? 'conversation.management.deleteGroup' : 'conversation.management.deleteChannel')}</Button>
      </div>
    </SettingsCard>
    <ConfirmDialog open={confirm !== null} danger busy={busy}
      title={t(confirm === 'transfer' ? 'conversation.management.transfer' : kind === 'group' ? 'conversation.management.deleteGroup' : 'conversation.management.deleteChannel')}
      description={confirm === 'transfer'
        ? t(kind === 'group' ? 'conversation.management.transferGroupHint' : 'conversation.management.transferChannelHint', { name: candidate ? labels.get(memberKey(candidate)) ?? t('chatList.unknownPeer') : '' })
        : t('conversation.management.deleteHint')}
      confirmLabel={t(confirm === 'transfer' ? 'conversation.management.transfer' : 'conversation.management.confirmDelete')}
      onConfirm={() => { void execute() }} onClose={() => { if (!submitting.current) setConfirm(null) }} />
  </>
}
