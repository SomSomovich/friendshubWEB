import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { setChannelPublic } from '../../api/channels'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import type { Account } from '../../types'
import { Button } from '../ui/Button'
import { SettingsCard, SettingsRow, SettingsToggle } from '../settings/Section'

export type ChannelPublicPanelProps = {
  account: Account
  conversationId: string
  /**
   * What this device last set, or `null` while nothing has been set from here.
   *
   * The flag is write-only: `POST /channels/{id}/public` sets it and no endpoint
   * returns it, and the conversation list does not carry it either.
   */
  current: boolean | null
  onSaved: (isPublic: boolean) => void
}

/**
 * Whether anyone may subscribe to the channel.
 *
 * Until this device has set the flag once, the panel offers the two choices
 * instead of a switch: a switch would have to show *some* position, and either
 * one would be a claim about the server that nothing here can support. After a
 * change the switch is honest, because it shows what was just sent.
 */
export function ChannelPublicPanel({
  account,
  conversationId,
  current,
  onSaved,
}: ChannelPublicPanelProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('conversation')
  const [busy, setBusy] = useState(false)

  async function write(isPublic: boolean): Promise<void> {
    setBusy(true)
    try {
      await setChannelPublic(account, conversationId, isPublic)
      onSaved(isPublic)
      toast.notify({ kind: 'success', message: t('conversation.channelSettings.public.saved') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsCard
      title={t('conversation.channelSettings.public.title')}
      description={t('conversation.channelSettings.public.hint')}
    >
      <SettingsRow label={t('conversation.channelSettings.public.title')}>
        {current === null ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={busy}
              onClick={() => {
                void write(true)
              }}
            >
              {t('conversation.channelSettings.public.makePublic')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => {
                void write(false)
              }}
            >
              {t('conversation.channelSettings.public.makePrivate')}
            </Button>
          </div>
        ) : (
          <SettingsToggle
            label={t('conversation.channelSettings.public.title')}
            checked={current}
            disabled={busy}
            onChange={(next) => {
              void write(next)
            }}
          />
        )}
      </SettingsRow>

      {current === null ? (
        <p className="text-xs text-pretty text-fg-muted">{t('conversation.channelSettings.public.unknown')}</p>
      ) : (
        <p className="text-xs text-pretty text-fg-muted">{t('conversation.channelSettings.public.note')}</p>
      )}
    </SettingsCard>
  )
}
