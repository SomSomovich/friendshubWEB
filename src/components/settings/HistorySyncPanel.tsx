import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { clearHistoryTransfers } from '../../crypto/historySync'
import { listOwnDevices } from '../../api/devices'
import { useAccountResource } from '../../hooks/useAccountResource'
import { useActionReporter } from '../../hooks/useActionReporter'
import { requireAccountStore } from '../../state/accountRegistry'
import { useHistorySyncStore } from '../../state/historySyncStore'
import type { Account } from '../../types'
import { requireActiveClient } from '../../ws/activeClient'
import { Button } from '../ui/Button'
import { PanelError } from './PanelError'
import { PanelSkeleton } from './PanelSkeleton'
import { SettingsCard } from './Section'

export function HistorySyncPanel({ account }: { account: Account }) {
  const { t } = useTranslation()
  const fail = useActionReporter('history-sync')
  const devices = useAccountResource(account, listOwnDevices)
  const conversations = useStore(requireAccountStore(account.id), (state) => state.conversations)
  const progress = useHistorySyncStore((state) => state.accounts[account.id])
  const [target, setTarget] = useState(() => progress ? String(progress.sourceDevice) : '')
  const submitting = useRef(false)
  const running = progress?.status === 'requesting' || progress?.status === 'receiving'
  useEffect(() => {
    const timer = setInterval(() => {
      const current = useHistorySyncStore.getState().accounts[account.id]
      if (current && (current.status === 'requesting' || current.status === 'receiving') && Date.now() - current.updatedAt > 120_000) {
        useHistorySyncStore.getState().fail(account.id, t('historySync.timeout'))
      }
    }, 10_000)
    return () => clearInterval(timer)
  }, [account.id, t])
  async function request(): Promise<void> {
    const source = Number(target)
    if (submitting.current || running || !devices.data?.some((device) => device.deviceNumber === source && source !== account.deviceNumber)) return
    submitting.current = true
    try {
      const client = requireActiveClient()
      if (!client.isConnected) throw new Error(t('historySync.offline'))
      const ids = conversations.filter((conversation) => conversation.kind !== 'channel').map((conversation) => conversation.id)
      if (ids.length === 0) return
      clearHistoryTransfers(account.id)
      useHistorySyncStore.getState().start(account.id, source, ids)
      for (let index = 0; index < ids.length; index += 200) client.requestHistory(source, ids.slice(index, index + 200))
    } catch (cause) {
      useHistorySyncStore.getState().fail(account.id, cause instanceof Error ? cause.message : String(cause))
      fail(cause)
    } finally { submitting.current = false }
  }
  return <SettingsCard title={t('historySync.title')} description={t('historySync.hint')}>
    {devices.error !== null ? <PanelError message={devices.error} onRetry={devices.reload} />
      : devices.data === null ? <PanelSkeleton /> : <>
        <label className="flex flex-col gap-1 text-xs font-medium text-fg-muted">
          {t('historySync.source')}
          <select value={target} disabled={running} onChange={(event) => setTarget(event.target.value)}
            className="h-10 w-full min-w-0 rounded-lg border border-border bg-bg px-3 text-sm text-fg focus-visible:outline-2 focus-visible:outline-accent">
            <option value="">{t('historySync.choose')}</option>
            {devices.data.filter((device) => device.deviceNumber !== account.deviceNumber).map((device) => (
              <option key={device.id} value={device.deviceNumber}>{device.name} · {device.deviceNumber}</option>
            ))}
          </select>
        </label>
        <Button className="self-start" size="sm" loading={running} disabled={!target || conversations.length === 0} onClick={() => { void request() }}>{t('historySync.request')}</Button>
      </>}
    {progress ? <p role="status" className="text-xs text-fg-muted">
      {progress.status === 'error' ? progress.error : progress.status === 'complete'
        ? t('historySync.complete', { count: progress.received })
        : t('historySync.progress', { count: progress.received, done: progress.completed.length, total: progress.pending.length })}
    </p> : null}
  </SettingsCard>
}
