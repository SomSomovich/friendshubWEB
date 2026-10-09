import { LogOut, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { unsubscribeChannel } from '../../api/channels'
import { leaveConversation } from '../../api/conversations'
import { MemberRow } from '../conversation/MemberRow'
import { useActionReporter } from '../../hooks/useActionReporter'
import {
  canOpenMemberProfile,
  isConversationStaff,
  useConversationMembers,
} from '../../hooks/useConversationMembers'
import { memberKey, useMemberLabels } from '../../hooks/useMemberLabels'
import { useToast } from '../../hooks/useToast'
import { requireAccountStore } from '../../state/accountRegistry'
import { useUiStore } from '../../state/uiStore'
import type { ConversationRecord } from '../../storage/db'
import type { Account } from '../../types'
import { formatDateOnly } from '../../utils/chatTime'
import { cn } from '../../utils/cn'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Modal } from '../ui/Modal'
import { Skeleton } from '../ui/Skeleton'

export type ConversationProfileModalProps = {
  open: boolean
  account: Account
  conversation: ConversationRecord
  avatarUrl: string | null
  /** Closes the dialog without leaving the conversation. */
  onClose: () => void
  /** Opens the management screen; only offered to the owner and to admins. */
  onOpenSettings: () => void
  /** The account is no longer in the conversation, so the chat must be left. */
  onLeft: () => void
}

/**
 * A group's or a channel's profile — what tapping the chat's title opens.
 *
 * The member list is read only while the dialog is open, and only for a group or
 * a channel: a member list is what decides whether the settings pencil appears,
 * and a channel with ten thousand subscribers would otherwise be downloaded in
 * full every time its chat was opened.
 */
export function ConversationProfileModal({
  open,
  account,
  conversation,
  avatarUrl,
  onClose,
  onOpenSettings,
  onLeft,
}: ConversationProfileModalProps) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('conversation')
  const openProfile = useUiStore((state) => state.openProfile)

  const isChannel = conversation.kind === 'channel'
  const manageable = conversation.kind === 'group' || conversation.kind === 'channel'
  const members = useConversationMembers(
    account,
    conversation.id,
    open && manageable ? conversation.kind : null,
  )
  const labels = useMemberLabels(account, members.members)

  const [confirmLeave, setConfirmLeave] = useState(false)
  const [busy, setBusy] = useState(false)

  const staff = isConversationStaff(members.self)
  // A known owner is never offered the door: leaving a group leaves it with no
  // owner and with no way to hand ownership on (no endpoint transfers it), and
  // the channel endpoint refuses the owner outright.
  const canLeave = manageable && (members.self === null || members.self.role !== 'owner')

  const title = conversation.title ?? t('chatList.unknownPeer')
  const created = formatDateOnly(conversation.createdAt, i18n.language)
  const preview = members.members.slice(0, MEMBER_PREVIEW)

  async function leave(): Promise<void> {
    setBusy(true)
    try {
      if (isChannel) {
        await unsubscribeChannel(account, conversation.id)
      } else {
        await leaveConversation(account, conversation.id)
      }
      // The list still holds a row for a conversation that is gone.
      await requireAccountStore(account.id).getState().actions.loadConversations()
      setConfirmLeave(false)
      toast.notify({
        kind: 'success',
        message: isChannel ? t('conversation.unsubscribed') : t('conversation.left'),
      })
      onLeft()
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Modal
        open={open && manageable}
        onClose={onClose}
        title={isChannel ? t('conversation.channel') : t('conversation.group')}
        size="lg"
        headerAction={
          staff ? (
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label={
                isChannel ? t('conversation.settings.titleChannel') : t('conversation.settings.titleGroup')
              }
              title={
                isChannel ? t('conversation.settings.titleChannel') : t('conversation.settings.titleGroup')
              }
              className={cn(
                'flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-muted',
                'hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
              )}
            >
              <Pencil className="size-4" aria-hidden />
            </button>
          ) : null
        }
        footer={
          canLeave ? (
            <Button
              variant="danger"
              onClick={() => {
                setConfirmLeave(true)
              }}
            >
              <LogOut className="size-4" aria-hidden />
              {isChannel ? t('conversation.leave.channel') : t('conversation.leave.group')}
            </Button>
          ) : null
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={title} src={avatarUrl} size="xl" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-base font-semibold text-fg">{title}</span>
              <span className="text-sm text-fg-muted">
                {isChannel
                  ? t('conversation.subscriberCount', { count: conversation.memberCount })
                  : t('conversation.memberCount', { count: conversation.memberCount })}
              </span>
              <span className="text-xs text-fg-muted">{t(isChannel ? 'conversation.createdChannel' : 'conversation.createdGroup', { date: created })}</span>
            </div>
          </div>

          {members.loading ? (
            <div className="flex flex-col gap-1" role="status" aria-label={t('common.loading')}>
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : members.failed ? (
            <p className="text-xs text-pretty text-fg-muted">{t('conversation.membersUnavailable')}</p>
          ) : (
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-fg">
                {isChannel
                  ? t('conversation.members.channelTitle')
                  : t('conversation.members.title')}
              </h3>
              <ul className="flex flex-col gap-0.5">
                {preview.map((member) => (
                  <MemberRow
                    key={memberKey(member)}
                    member={member}
                    label={
                      labels.get(memberKey(member)) ??
                      (member.actorType === 'bot' ? t('conversation.bot') : t('chatList.unknownPeer'))
                    }
                    isSelf={member.id === account.id}
                    onOpen={
                      canOpenMemberProfile(member, account.id)
                        ? () => {
                            openProfile(member.id)
                          }
                        : undefined
                    }
                  />
                ))}
                {members.members.length > preview.length ? (
                  <li className="px-2 py-1 text-xs text-fg-muted">
                    {t('conversation.member.previewMore', {
                      count: members.members.length - preview.length,
                    })}
                  </li>
                ) : null}
              </ul>
            </div>
          )}

          {canLeave ? (
            <p className="text-xs text-pretty text-fg-muted">
              {isChannel ? t('conversation.leave.channelHint') : t('conversation.leave.groupHint')}
            </p>
          ) : (
            <p className="text-xs text-pretty text-fg-muted">{t('conversation.leave.ownerNote')}</p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmLeave}
        title={isChannel ? t('conversation.leave.channel') : t('conversation.leave.group')}
        description={isChannel ? t('conversation.leave.channelHint') : t('conversation.leave.groupHint')}
        confirmLabel={isChannel ? t('conversation.leave.channel') : t('conversation.leave.group')}
        danger
        busy={busy}
        onConfirm={() => {
          void leave()
        }}
        onClose={() => {
          setConfirmLeave(false)
        }}
      />
    </>
  )
}

/** Members shown before the list is summarised as "and N more". */
const MEMBER_PREVIEW = 12
