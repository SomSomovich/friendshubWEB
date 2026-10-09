import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addChannelBot } from '../../api/channels'
import { listOwnedBots, type OwnedBot } from '../../api/bots'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import type { Account } from '../../types'
import { Button } from '../ui/Button'
import { SettingsCard } from '../settings/Section'
import { Skeleton } from '../ui/Skeleton'

export type ChannelBotsPanelProps = {
  account: Account
  conversationId: string
  /** Bots already in the channel, taken from its member list. */
  presentBotIds: string[]
  onChanged: () => void
}

/**
 * Bots that publish in the channel.
 *
 * Only this account's own bots can be added — the server refuses one that
 * belongs to somebody else — so the list is exactly `GET /user/bots`. A bot
 * joins as a subscriber and is promoted from the member list like anyone else,
 * which is why there is no rights control here.
 */
export function ChannelBotsPanel({
  account,
  conversationId,
  presentBotIds,
  onChanged,
}: ChannelBotsPanelProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('conversation')

  const [bots, setBots] = useState<OwnedBot[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void listOwnedBots(account)
      .then((loaded) => {
        if (!cancelled) {
          setBots(loaded)
        }
      })
      .catch((error: unknown) => {
        fail(error)
        if (!cancelled) {
          setBots([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [account, fail])

  async function add(bot: OwnedBot): Promise<void> {
    setBusyId(bot.botId)
    try {
      await addChannelBot(account, conversationId, bot.botId)
      onChanged()
      toast.notify({ kind: 'success', message: t('conversation.channelSettings.bots.added') })
    } catch (error) {
      fail(error)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <SettingsCard title={t('conversation.channelSettings.bots.title')} description={t('conversation.channelSettings.bots.hint')}>
      {bots === null ? (
        <div className="flex flex-col gap-1" role="status" aria-label={t('common.loading')}>
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ) : bots.length === 0 ? (
        <p className="text-xs text-pretty text-fg-muted">{t('conversation.channelSettings.bots.none')}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {bots.map((bot) => {
            const present = presentBotIds.includes(bot.botId)
            return (
              <li
                key={bot.botId}
                className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-fg">@{bot.handle}</span>
                {present ? (
                  <span className="shrink-0 text-xs text-fg-muted">
                    {t('conversation.channelSettings.bots.present')}
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={busyId === bot.botId}
                    disabled={busyId !== null}
                    onClick={() => {
                      void add(bot)
                    }}
                  >
                    {t('conversation.channelSettings.bots.add')}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </SettingsCard>
  )
}
