import { Pencil, ShieldCheck, Tag, Volume2, VolumeX, UserMinus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GROUP_PERM, hasPermission, muteMember, setMemberRole, addGroupMember, removeGroupMember, removeGroupMemberTag, setGroupMemberTag } from '../../api/groups'
import { canOpenMemberProfile, type ConversationMember } from '../../hooks/useConversationMembers'
import { memberKey } from '../../hooks/useMemberLabels'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import { useUiStore } from '../../state/uiStore'
import type { Account } from '../../types'
import { nowSeconds } from '../../utils/time'
import { MuteDialog, type MuteChoice } from '../layout/MuteDialog'
import { listContacts } from '../../api/contacts'
import { useAccountResource } from '../../hooks/useAccountResource'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { PanelError } from '../settings/PanelError'
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

/** Group membership and moderation, gated by the acting member’s permissions. */
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
  const canChangeTags = isOwner || hasPermission(self.permissions, GROUP_PERM.changeTags)

  const [rights, setRights] = useState<ConversationMember | null>(null)
  const [muting, setMuting] = useState<ConversationMember | null>(null)
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<ConversationMember | null>(null)
  const [adding, setAdding] = useState('')
  const [tagTarget, setTagTarget] = useState<ConversationMember | null>(null)
  const [tagValue, setTagValue] = useState('')
  const contacts = useAccountResource(account, listContacts)
  const changingMembers = useRef(false)
  const candidates = (contacts.data ?? []).filter((contact) => !members.some((member) => member.id === contact.targetAccountId))
  async function changeMember(remove: boolean): Promise<void> {
    const id = remove ? removing?.id : adding
    if (!id || changingMembers.current) return
    changingMembers.current = true
    setBusy(true)
    try {
      await (remove ? removeGroupMember : addGroupMember)(account, conversationId, id)
      setRemoving(null)
      setAdding('')
      onChanged()
    } catch (cause) { fail(cause) }
    finally { changingMembers.current = false; setBusy(false) }
  }

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

  function openTagEditor(member: ConversationMember): void {
    setTagTarget(member)
    setTagValue(member.groupTag ?? '')
  }

  async function saveTag(): Promise<void> {
    if (tagTarget === null) return
    const normalized = tagValue.trim()
    if (!isValidGroupTag(normalized)) return

    setBusy(true)
    try {
      await setGroupMemberTag(account, conversationId, tagTarget.id, normalized)
      setTagTarget(null)
      onChanged()
      toast.notify({ kind: 'success', message: t('conversation.member.tagSaved') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  async function clearTag(): Promise<void> {
    if (tagTarget === null || tagTarget.groupTag === null) return
    setBusy(true)
    try {
      await removeGroupMemberTag(account, conversationId, tagTarget.id)
      setTagTarget(null)
      onChanged()
      toast.notify({ kind: 'success', message: t('conversation.member.tagRemoved') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsCard title={t('conversation.members.title')} description={t('conversation.management.membersHint')}>
      <ul className="flex flex-col gap-0.5">
        {members.map((member) => {
          const muted = member.mutedUntil !== null && member.mutedUntil > nowSeconds()
          // The owner and the acting member are never moderation targets.
          const actionable = member.role !== 'owner' && member.id !== account.id && (canManageRoles || canMute)
          const tagEditable = canChangeTags && member.actorType === 'account'

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
                actionable || tagEditable ? (
                  <>
                    {tagEditable ? (
                      <MemberAction
                        icon={member.groupTag === null ? Tag : Pencil}
                        disabled={busy}
                        label={t(member.groupTag === null ? 'conversation.member.addTag' : 'conversation.member.editTag')}
                        onClick={() => openTagEditor(member)}
                      />
                    ) : null}
                    {actionable && canManageRoles ? (
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
                    {actionable && canMute ? <MemberAction icon={UserMinus} danger disabled={busy}
                      label={t('conversation.management.removeMember')} onClick={() => setRemoving(member)} /> : null}
                    {actionable && canMute ? (
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

      {contacts.error !== null ? <PanelError message={contacts.error} onRetry={contacts.reload} /> : (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-fg-muted">
            {t('conversation.management.addMember')}
            <select value={adding} disabled={busy || contacts.data === null} onChange={(event) => setAdding(event.target.value)}
              className="h-10 rounded-lg border border-border bg-bg px-3 text-sm text-fg focus-visible:outline-2 focus-visible:outline-accent">
              <option value="">{t('settings.privacy.pickContact')}</option>
              {candidates.map((contact) => <option key={contact.targetAccountId} value={contact.targetAccountId}>{contact.localUsername ?? contact.username}</option>)}
            </select>
          </label>
          <Button className="self-start" size="sm" loading={busy} disabled={!adding || members.length >= 5000}
            onClick={() => { void changeMember(false) }}>{t('conversation.management.addMember')}</Button>
        </div>
      )}
      <ConfirmDialog open={removing !== null} danger busy={busy} title={t('conversation.management.removeMember')}
        description={t('conversation.management.removeMemberHint', { name: removing ? labelOf(removing) : '' })}
        confirmLabel={t('conversation.management.removeMember')} onConfirm={() => { void changeMember(true) }}
        onClose={() => { if (!changingMembers.current) setRemoving(null) }} />
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

      <Modal
        open={tagTarget !== null}
        onClose={() => { if (!busy) setTagTarget(null) }}
        title={t('conversation.member.editTagTitle')}
        footer={(
          <>
            {tagTarget?.groupTag ? (
              <Button variant="danger" disabled={busy} onClick={() => { void clearTag() }}>
                {t('conversation.member.removeTag')}
              </Button>
            ) : null}
            <Button variant="secondary" disabled={busy} onClick={() => setTagTarget(null)}>{t('common.cancel')}</Button>
            <Button loading={busy} disabled={!isValidGroupTag(tagValue)} onClick={() => { void saveTag() }}>
              {t('settings.save')}
            </Button>
          </>
        )}
      >
        <Input
          autoFocus
          label={t('conversation.member.tagLabel')}
          value={tagValue}
          onChange={(event) => setTagValue(event.target.value)}
          helper={t('conversation.member.tagHint')}
          maxLength={18}
        />
      </Modal>

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

function isValidGroupTag(value: string): boolean {
  const normalized = value.trim()
  const count = Array.from(normalized).length
  return count >= 1 && count <= 9 && !/[<>&]/u.test(normalized) && !/\p{Cc}/u.test(normalized)
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
