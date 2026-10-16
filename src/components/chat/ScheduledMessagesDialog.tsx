import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cancelScheduled, listScheduled, type ScheduledEnvelope } from '../../api/scheduled'
import { useToast } from '../../hooks/useToast'
import type { Account } from '../../types'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Modal } from '../ui/Modal'

type ScheduledMessage = {
  key: string
  sendAt: number
  createdAt: number
  envelopeIds: string[]
}

export function ScheduledMessagesDialog({
  open,
  onClose,
  account,
  conversationId,
  version,
}: {
  open: boolean
  onClose: () => void
  account: Account
  conversationId: string
  version: number
}) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const [items, setItems] = useState<ScheduledEnvelope[]>([])
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await listScheduled(account))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      setError(message || t('scheduled.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [account, t])

  useEffect(() => {
    if (open) void refresh()
  }, [open, refresh, version])

  const messages = useMemo(() => groupScheduled(items, conversationId), [items, conversationId])

  async function cancel(message: ScheduledMessage): Promise<void> {
    setCancelling(message.key)
    try {
      const results = await Promise.allSettled(
        message.envelopeIds.map((id) => cancelScheduled(account, id)),
      )
      if (results.some((result) => result.status === 'rejected')) {
        await refresh()
        toast.notify({ kind: 'error', message: t('scheduled.cancelPartial') })
        return
      }
      setItems((current) => current.filter((item) => !message.envelopeIds.includes(item.envelopeId)))
      toast.notify({ kind: 'success', message: t('scheduled.cancelled') })
    } catch (cause) {
      const messageText = cause instanceof Error ? cause.message : String(cause)
      toast.notify({ kind: 'error', message: messageText || t('scheduled.cancelFailed') })
    } finally {
      setCancelling(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('scheduled.title')}>
      {loading ? (
        <p role="status" className="text-sm text-fg-muted">{t('common.loading')}</p>
      ) : error !== null ? (
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-sm text-danger">{error}</p>
          <Button variant="secondary" onClick={() => { void refresh() }}>{t('common.retry')}</Button>
        </div>
      ) : messages.length === 0 ? (
        <EmptyState icon={CalendarClock} title={t('scheduled.empty')} description={t('scheduled.emptyHint')} />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {messages.map((message) => (
            <li key={message.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">
                  {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(message.sendAt * 1000)}
                </p>
                <p className="text-xs text-fg-muted">{t('scheduled.deviceCount', { count: message.envelopeIds.length })}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                loading={cancelling === message.key}
                disabled={cancelling !== null}
                onClick={() => { void cancel(message) }}
              >
                {t('scheduled.cancel')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

function groupScheduled(items: ScheduledEnvelope[], conversationId: string): ScheduledMessage[] {
  const grouped = new Map<string, ScheduledMessage>()
  for (const item of items) {
    if (item.conversationId !== conversationId) continue
    const key = `${item.clientTimestamp}:${item.sendAt}`
    const message = grouped.get(key)
    if (message === undefined) {
      grouped.set(key, {
        key,
        sendAt: item.sendAt,
        createdAt: item.clientTimestamp,
        envelopeIds: [item.envelopeId],
      })
    } else {
      message.envelopeIds.push(item.envelopeId)
    }
  }
  return [...grouped.values()].sort((a, b) => a.sendAt - b.sendAt || a.createdAt - b.createdAt)
}
