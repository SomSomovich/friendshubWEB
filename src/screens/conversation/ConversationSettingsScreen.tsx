import { Info, Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useStore } from 'zustand'
import { GROUP_PERM, hasPermission, type GroupPermission } from '../../api/groups'
import { ChannelBotsPanel } from '../../components/conversation/ChannelBotsPanel'
import { ChannelDiscussionPanel } from '../../components/conversation/ChannelDiscussionPanel'
import { ChannelMembersPanel } from '../../components/conversation/ChannelMembersPanel'
import { ChannelPublicPanel } from '../../components/conversation/ChannelPublicPanel'
import { ConversationHandlePanel } from '../../components/conversation/ConversationHandlePanel'
import { ConversationPhotoPanel } from '../../components/conversation/ConversationPhotoPanel'
import { GroupInvitesPanel } from '../../components/conversation/GroupInvitesPanel'
import { GroupMembersPanel } from '../../components/conversation/GroupMembersPanel'
import { ScreenHeader } from '../../components/layout/ScreenHeader'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import { isConversationStaff, useConversationMembers } from '../../hooks/useConversationMembers'
import { useActiveAccount } from '../../hooks/useActiveAccount'
import { useConversation } from '../../hooks/useConversation'
import { useConversationMirror } from '../../hooks/useConversationMirror'
import { useMemberLabels } from '../../hooks/useMemberLabels'
import { chatPath, ROUTES } from '../../router/paths'
import { requireAccountStore } from '../../state/accountRegistry'
import type { Account } from '../../types'

/**
 * Managing a group or a channel — what the pencil in its profile opens.
 *
 * Reached only from that pencil, and only for the owner and for admins, so the
 * screen does not advertise itself; but it is a route, so it validates who is
 * looking rather than trusting that. Every section is gated on the reader's own
 * member row, which is also what the server checks on each write: a group admin
 * sees the invite links only with `PERM_MANAGE_INVITES`, and a channel admin
 * sees the picture and the member list and nothing else.
 */
export function ConversationSettingsScreen() {
  const { id } = useParams<{ id: string }>()
  const account = useActiveAccount()

  if (id === undefined) {
    return <Navigate to={ROUTES.app} replace />
  }
  if (account === null) {
    return null
  }
  return <SettingsView key={id} account={account} conversationId={id} />
}

function SettingsView({ account, conversationId }: { account: Account; conversationId: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const store = requireAccountStore(account.id)
  const conversations = useStore(store, (state) => state.conversations)

  const view = useConversation(account, conversationId)
  const conversation = view.conversation
  const kind =
    conversation?.kind === 'group' || conversation?.kind === 'channel' ? conversation.kind : null

  const members = useConversationMembers(account, conversationId, kind)
  const labels = useMemberLabels(account, members.members)
  const { mirror, update } = useConversationMirror(account.id, conversationId)

  const title = conversation?.title ?? t('chatList.unknownPeer')
  const back = () => {
    void navigate(chatPath(conversationId))
  }

  const header = (
    <ScreenHeader
      title={
        kind === 'channel'
          ? t('conversation.settings.titleChannel')
          : t('conversation.settings.titleGroup')
      }
      subtitle={conversation === null ? undefined : title}
      onBack={back}
      backMode="always"
    />
  )

  if (view.loading || members.loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg text-fg">
        {header}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (kind === null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg text-fg">
        {header}
        <EmptyState
          icon={Settings2}
          title={t('conversation.settings.unsupported')}
          action={
            <Button variant="secondary" onClick={back}>
              {t('conversation.settings.backToChat')}
            </Button>
          }
        />
      </div>
    )
  }

  const self = members.self
  if (self === null || !isConversationStaff(self)) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg text-fg">
        {header}
        <EmptyState
          icon={Settings2}
          title={t('conversation.settings.noAccess')}
          description={members.failed ? t('conversation.settings.unavailable') : undefined}
          action={
            <Button
              variant="secondary"
              onClick={
                members.failed
                  ? () => {
                      // The list is the only source of what this account may do,
                      // so a read that failed is worth another try.
                      members.refresh()
                    }
                  : back
              }
            >
              {members.failed ? t('common.retry') : t('conversation.settings.backToChat')}
            </Button>
          }
        />
      </div>
    )
  }

  const isOwner = self.role === 'owner'
  /** A group bit, with the owner's implicit "all of them" folded in. */
  const can = (bit: GroupPermission): boolean => isOwner || hasPermission(self.permissions, bit)
  const groups = conversations.filter((entry) => entry.kind === 'group')
  const presentBotIds = members.members
    .filter((member) => member.actorType === 'bot')
    .map((member) => member.id)

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg text-fg">
      {header}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          {kind === 'group' ? (
            <>
              {can(GROUP_PERM.changeProfile) ? (
                <>
                  <ConversationPhotoPanel
                    account={account}
                    conversationId={conversationId}
                    kind="group"
                    title={title}
                    avatarUrl={view.avatarUrl}
                    onChanged={view.refresh}
                  />
                  <ConversationHandlePanel
                    account={account}
                    conversationId={conversationId}
                    kind="group"
                    current={mirror?.handle ?? null}
                    onSaved={(handle) => {
                      void update({ handle })
                    }}
                  />
                </>
              ) : null}

              <GroupMembersPanel
                account={account}
                conversationId={conversationId}
                members={members.members}
                self={self}
                labels={labels}
                onChanged={members.refresh}
              />

              {can(GROUP_PERM.manageInvites) ? (
                <GroupInvitesPanel account={account} conversationId={conversationId} />
              ) : null}
            </>
          ) : (
            <>
              <ConversationPhotoPanel
                account={account}
                conversationId={conversationId}
                kind="channel"
                title={title}
                avatarUrl={view.avatarUrl}
                onChanged={view.refresh}
              />

              {isOwner ? (
                <>
                  <ConversationHandlePanel
                    account={account}
                    conversationId={conversationId}
                    kind="channel"
                    current={mirror?.handle ?? null}
                    onSaved={(handle) => {
                      void update({ handle })
                    }}
                  />
                  <ChannelPublicPanel
                    account={account}
                    conversationId={conversationId}
                    current={mirror?.isPublic ?? null}
                    onSaved={(isPublic) => {
                      void update({ isPublic })
                    }}
                  />
                  <ChannelDiscussionPanel
                    account={account}
                    conversationId={conversationId}
                    groups={groups}
                    current={mirror?.discussionGroupId ?? null}
                    onSaved={(discussionGroupId) => {
                      void update({ discussionGroupId })
                    }}
                  />
                </>
              ) : null}

              <ChannelMembersPanel
                account={account}
                conversationId={conversationId}
                members={members.members}
                self={self}
                labels={labels}
                onChanged={members.refresh}
              />

              {isOwner ? (
                <ChannelBotsPanel
                  account={account}
                  conversationId={conversationId}
                  presentBotIds={presentBotIds}
                  onChanged={members.refresh}
                />
              ) : null}
            </>
          )}

          <p className="flex items-center gap-2 text-xs text-pretty text-fg-muted">
            <Info className="size-4 shrink-0" aria-hidden />
            {t('conversation.settings.auditNote')}
          </p>
        </div>
      </div>
    </div>
  )
}
