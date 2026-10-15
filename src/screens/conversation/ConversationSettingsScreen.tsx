import { Settings2 } from 'lucide-react'
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
import { useConversationDetails } from '../../hooks/useConversationDetails'
import { GroupMetadataPanel } from '../../components/conversation/GroupMetadataPanel'
import { ConversationOwnershipPanel } from '../../components/conversation/ConversationOwnershipPanel'
import { PanelError } from '../../components/settings/PanelError'
import { ChannelAnalyticsPanel } from '../../components/conversation/ChannelAnalyticsPanel'
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
 * can also manage channel invitation links.
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
  const metadata = useConversationDetails(account, conversationId, kind)

  const title = metadata.data?.title ?? conversation?.title ?? t('chatList.unknownPeer')
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

  if (view.loading || members.loading || (kind !== null && metadata.data === null && metadata.error === null)) {
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

  if (metadata.error !== null) {
    return <div className="flex flex-1 flex-col bg-bg text-fg">{header}<div className="p-4"><PanelError message={metadata.error} onRetry={metadata.reload} /></div></div>
  }
  const detail = metadata.data
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

  const isOwner = self.role === 'owner' && detail?.ownerAccountId === account.id
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
                  {detail !== null ? <GroupMetadataPanel account={account} group={detail} isOwner={isOwner}
                    onChanged={() => { metadata.reload(); void store.getState().actions.loadConversations() }} /> : null}
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
                    current={detail?.handle ?? null}
                    onSaved={() => metadata.reload()}
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
                    current={detail?.handle ?? null}
                    onSaved={() => metadata.reload()}
                  />
                  <ChannelPublicPanel
                    account={account}
                    conversationId={conversationId}
                    current={detail?.isPublic ?? null}
                    onSaved={() => metadata.reload()}
                  />
                  <ChannelDiscussionPanel
                    account={account}
                    conversationId={conversationId}
                    groups={groups}
                    current={detail !== null && 'linkedGroupConversationId' in detail ? detail.linkedGroupConversationId : null}
                    onSaved={() => metadata.reload()}
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

              <GroupInvitesPanel account={account} conversationId={conversationId} />

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

          {kind === 'channel' ? <ChannelAnalyticsPanel account={account} conversationId={conversationId} /> : null}
          {isOwner ? <>
            <ConversationOwnershipPanel account={account} conversationId={conversationId} kind={kind}
              members={members.members} labels={labels}
              onChanged={() => { members.refresh(); metadata.reload(); void store.getState().actions.loadConversations() }}
              onDeleted={() => { void navigate(ROUTES.app, { replace: true }) }} />
          </> : null}
        </div>
      </div>
    </div>
  )
}
