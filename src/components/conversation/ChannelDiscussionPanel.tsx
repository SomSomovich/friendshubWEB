import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { setLinkedGroup } from '../../api/channels'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import type { ConversationRecord } from '../../storage/db'
import type { Account } from '../../types'
import { SettingsCard, SettingsChoice } from '../settings/Section'

export type ChannelDiscussionPanelProps = {
  account: Account
  conversationId: string
  /** The groups this account is in, which are the only ones the server accepts. */
  groups: ConversationRecord[]
  /** The link this device last set; `null` means none was set from here. */
  current: string | null
  onSaved: (groupId: string | null) => void
}

/** The "none" option's value; a conversation id is never the empty string. */
const NONE = ''

/**
 * The group a channel's readers comment in.
 *
 * Only this account's own groups are offered, because the server rejects a link
 * to a group the caller is not in — and it is the owner's channel, so there is
 * nobody else to ask. As with the handle, the current link is not readable, so
 * the note says what the selection is based on.
 */
export function ChannelDiscussionPanel({
  account,
  conversationId,
  groups,
  current,
  onSaved,
}: ChannelDiscussionPanelProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('conversation')
  const [busy, setBusy] = useState(false)

  async function choose(value: string): Promise<void> {
    setBusy(true)
    try {
      await setLinkedGroup(account, conversationId, value === NONE ? null : value)
      onSaved(value === NONE ? null : value)
      toast.notify({ kind: 'success', message: t('conversation.channelSettings.discussion.saved') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsCard
      title={t('conversation.channelSettings.discussion.title')}
      description={t('conversation.channelSettings.discussion.hint')}
    >
      <SettingsChoice
        label={t('conversation.channelSettings.discussion.title')}
        value={current ?? NONE}
        disabled={busy}
        options={[
          { value: NONE, label: t('conversation.channelSettings.discussion.none') },
          ...groups.map((group) => ({
            value: group.id,
            label: group.title ?? t('chatList.unknownPeer'),
          })),
        ]}
        onChange={(value) => {
          void choose(value)
        }}
      />

      {groups.length === 0 ? (
        <p className="text-xs text-pretty text-fg-muted">{t('conversation.channelSettings.discussion.noGroups')}</p>
      ) : null}
      <p className="text-xs text-pretty text-fg-muted">{t('conversation.channelSettings.discussion.note')}</p>
    </SettingsCard>
  )
}
