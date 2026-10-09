import { ShieldCheck, ShieldMinus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { removeChannelMember, setChannelMemberRole } from '../../api/channels'
import { canOpenMemberProfile, type ConversationMember } from '../../hooks/useConversationMembers'
import { memberKey } from '../../hooks/useMemberLabels'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import { useUiStore } from '../../state/uiStore'
import type { Account } from '../../types'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { SettingsCard } from '../settings/Section'
import { MemberAction, MemberRow } from './MemberRow'

export type ChannelMembersPanelProps = {
  account: Account
  conversationId: string
  members: ConversationMember[]
  /** The reader's own row; every control here is the owner's. */
  self: ConversationMember
  labels: Map<string, string>
  onChanged: () => void
}

/**
 * A channel's subscribers, administrators and bots.
 *
 * Only the owner may change any of it — the server says so on all three
 * endpoints — so an admin sees the list and nothing to press. A bot is a member
 * like any other here: it can be promoted to publish posts, or removed.
 */
export function ChannelMembersPanel({
  account,
  conversationId,
  members,
  self,
  labels,
  onChanged,
}: ChannelMembersPanelProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('conversation')
  const openProfile = useUiStore((state) => state.openProfile)

  const isOwner = self.role === 'owner'
  const [removing, setRemoving] = useState<ConversationMember | null>(null)
  const [busy, setBusy] = useState(false)

  function labelOf(member: ConversationMember): string {
    return (
      labels.get(memberKey(member)) ??
      (member.actorType === 'bot' ? t('conversation.bot') : t('chatList.unknownPeer'))
    )
  }

  async function setRole(member: ConversationMember, admin: boolean): Promise<void> {
    setBusy(true)
    try {
      await setChannelMemberRole(account, conversationId, {
        actorType: member.actorType,
        actorId: member.id,
        role: admin ? 'admin' : 'subscriber',
      })
      onChanged()
      toast.notify({ kind: 'success', message: t('conversation.member.roleUpdated') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  async function remove(): Promise<void> {
    const target = removing
    if (target === null) {
      return
    }

    setBusy(true)
    try {
      await removeChannelMember(account, conversationId, {
        actorType: target.actorType,
        actorId: target.id,
      })
      setRemoving(null)
      onChanged()
      toast.notify({ kind: 'success', message: t('conversation.member.removed') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsCard title={t('conversation.members.title')} description={t('conversation.members.channelNote')}>
      <ul className="flex flex-col gap-0.5">
        {members.map((member) => {
          const admin = member.role === 'admin'
          const actionable = isOwner && member.role !== 'owner'

          return (
            <MemberRow
              key={memberKey(member)}
              member={member}
              label={labelOf(member)}
              isSelf={member.id === account.id}
              onOpen={
                canOpenMemberProfile(member, account.id)
                  ? () => {
                      openProfile(member.id)
                    }
                  : undefined
              }
              trailing={
                actionable ? (
                  <>
                    <MemberAction
                      icon={admin ? ShieldMinus : ShieldCheck}
                      disabled={busy}
                      label={admin ? t('conversation.member.demote') : t('conversation.member.makeAdmin')}
                      onClick={() => {
                        void setRole(member, !admin)
                      }}
                    />
                    <MemberAction
                      icon={Trash2}
                      danger
                      disabled={busy}
                      label={t('conversation.member.remove')}
                      onClick={() => {
                        setRemoving(member)
                      }}
                    />
                  </>
                ) : undefined
              }
            />
          )
        })}
      </ul>

      <ConfirmDialog
        open={removing !== null}
        title={t('conversation.member.remove')}
        description={
          removing === null
            ? ''
            : t('conversation.member.removeHint', { name: labelOf(removing) })
        }
        confirmLabel={t('conversation.member.remove')}
        danger
        busy={busy}
        onConfirm={() => {
          void remove()
        }}
        onClose={() => {
          setRemoving(null)
        }}
      />
    </SettingsCard>
  )
}
