import { ShieldCheck, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GROUP_PERM, hasPermission, muteMember, setMemberRole } from '../../api/groups'
import { canOpenMemberProfile, type ConversationMember } from '../../hooks/useConversationMembers'
import { memberKey } from '../../hooks/useMemberLabels'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import { useUiStore } from '../../state/uiStore'
import type { Account } from '../../types'
import { nowSeconds } from '../../utils/time'
import { MuteDialog, type MuteChoice } from '../layout/MuteDialog'
import { SettingsCard } from '../settings/Section'
import { MemberAction, MemberRow } from './MemberRow'
import { AdminRightsDialog } from './AdminRightsDialog'

export type GroupMembersPanelProps = {
  account: Account
  conversationId: string
  members: ConversationMember[]
  /** The reader's own row: what the controls below are gated on. */
  self: ConversationMember
  labels: Map<string, string>
  /** Re-reads the member list after a change. */
  onChanged: () => void
}

/**
 * A group's members, and the two things that can be done to one.
 *
 * Two, because the API offers two: there is no endpoint that adds a member to an
 * existing group (an invite is the way in) and none that removes one — the
 * server has `members/role` and `members/mute` for groups and a `remove` only
 * for channels. The card says so rather than leaving the reader to wonder where
 * the kick button went.
 */
export function GroupMembersPanel({
  account,
  conversationId,
  members,
  self,
  labels,
  onChanged,
}: GroupMembersPanelProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('conversation')
  const openProfile = useUiStore((state) => state.openProfile)

  const isOwner = self.role === 'owner'
  const canManageRoles = isOwner || hasPermission(self.permissions, GROUP_PERM.addAdmins)
  const canMute = isOwner || hasPermission(self.permissions, GROUP_PERM.banUsers)

  const [rights, setRights] = useState<ConversationMember | null>(null)
  const [muting, setMuting] = useState<ConversationMember | null>(null)
  const [busy, setBusy] = useState(false)

  function labelOf(member: ConversationMember): string {
    return (
      labels.get(memberKey(member)) ??
      (member.actorType === 'bot' ? t('conversation.bot') : t('chatList.unknownPeer'))
    )
  }

  async function saveRights(permissions: number): Promise<void> {
    const target = rights
    if (target === null) {
      return
    }

    setBusy(true)
    try {
      await setMemberRole(account, conversationId, {
        targetAccountId: target.id,
        // An empty mask is a demotion, and the server ignores it for a member.
        role: permissions === 0 ? 'member' : 'admin',
        permissions,
      })
      setRights(null)
      onChanged()
      toast.notify({ kind: 'success', message: t('conversation.member.roleUpdated') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  async function chooseMute(choice: MuteChoice): Promise<void> {
    const target = muting
    if (target === null) {
      return
    }

    setMuting(null)
    setBusy(true)
    try {
      await muteMember(account, conversationId, {
        targetAccountId: target.id,
        mutedUntil: mutedUntilFor(choice),
      })
      onChanged()
      toast.notify({
        kind: 'success',
        message: choice.kind === 'unmute' ? t('conversation.member.unmuteOn') : t('conversation.member.muteOn'),
      })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsCard title={t('conversation.members.title')} description={t('conversation.members.groupNote')}>
      <ul className="flex flex-col gap-0.5">
        {members.map((member) => {
          const muted = member.mutedUntil !== null && member.mutedUntil > nowSeconds()
          // The owner row has no controls: the server refuses to change or mute
          // the owner, and ownership is transferred by no endpoint at all.
          const actionable = member.role !== 'owner' && (canManageRoles || canMute)

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
                    {canManageRoles ? (
                      <MemberAction
                        icon={ShieldCheck}
                        disabled={busy}
                        label={
                          member.role === 'admin'
                            ? t('conversation.member.editRights')
                            : t('conversation.member.makeAdmin')
                        }
                        onClick={() => {
                          setRights(member)
                        }}
                      />
                    ) : null}
                    {canMute ? (
                      <MemberAction
                        icon={muted ? Volume2 : VolumeX}
                        disabled={busy}
                        label={
                          muted ? t('conversation.member.unmute') : t('conversation.member.mute')
                        }
                        onClick={() => {
                          setMuting(member)
                        }}
                      />
                    ) : null}
                  </>
                ) : undefined
              }
            />
          )
        })}
      </ul>

      {rights === null ? null : (
        <AdminRightsDialog
          key={memberKey(rights)}
          member={rights}
          label={labelOf(rights)}
          isOwner={isOwner}
          actorPermissions={self.permissions}
          busy={busy}
          onSave={(permissions) => {
            void saveRights(permissions)
          }}
          onClose={() => {
            setRights(null)
          }}
        />
      )}

      <MuteDialog
        open={muting !== null}
        muted={muting !== null && muting.mutedUntil !== null && muting.mutedUntil > nowSeconds()}
        title={muting === null ? '' : labelOf(muting)}
        onClose={() => {
          setMuting(null)
        }}
        onChoose={(choice) => {
          void chooseMute(choice)
        }}
      />
    </SettingsCard>
  )
}

/**
 * "Until further notice", as a timestamp.
 *
 * The member endpoint takes an absolute moment and reads `null` as "unmute", so
 * the dialog's "forever" — which the conversation endpoint spells as a null
 * duration — has to be a date far enough away that nobody will see the end of
 * it.
 */
const FOREVER_MUTE_SECONDS = 100 * 365 * 24 * 3_600

function mutedUntilFor(choice: MuteChoice): number | null {
  if (choice.kind === 'unmute') {
    return null
  }
  return nowSeconds() + (choice.durationSeconds ?? FOREVER_MUTE_SECONDS)
}
