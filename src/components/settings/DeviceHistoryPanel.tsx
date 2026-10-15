import { useChatList } from '../../hooks/useChatList'
import { nextHistoryBefore } from '../../utils/historyCursor'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { getConversationEnvelopes } from '../../api/conversations'
import { DEVICE_HISTORY_PAGE_SIZE, restoreEnvelopePage, type HistoryPageResult } from '../../crypto/httpHistory'
import { useActionReporter } from '../../hooks/useActionReporter'
import { requireAccountStore } from '../../state/accountRegistry'
import { mergeById } from '../../state/applyEnvelope'
import type { Account } from '../../types'
import { Button } from '../ui/Button'
import { SettingsCard } from './Section'

export function DeviceHistoryPanel({ account }: { account: Account }) {
  const { t } = useTranslation()
  const fail = useActionReporter('device-history')
  const store = requireAccountStore(account.id)
  const labels = useChatList(account)
  const conversations = useStore(store, (state) => state.conversations)
  const [selected, setSelected] = useState('')
  const [page, setPage] = useState<{ before?: number; done: boolean; stats: HistoryPageResult } | null>(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  async function load(older: boolean): Promise<void> {
    if (lock.current || !conversations.some((item) => item.id === selected && item.kind !== 'channel')) return
    lock.current = true; setBusy(true)
    try {
      const rows = await getConversationEnvelopes(account, selected, { before: older ? page?.before : undefined, limit: DEVICE_HISTORY_PAGE_SIZE })
      const stats = await restoreEnvelopePage(account, selected, rows)
      store.setState((state) => ({ identityChanges: stats.identityChanges.length > 0 ? stats.identityChanges : state.identityChanges, messagesVersion: state.messagesVersion + stats.messages.length,
        messages: state.activeConversationId === selected ? mergeById(stats.messages, state.messages) : state.messages }))
      setPage({ before: nextHistoryBefore(rows.map((row) => row.serverTimestamp), older ? page?.before : undefined), done: rows.length < DEVICE_HISTORY_PAGE_SIZE, stats })
    } catch (cause) { fail(cause) }
    finally { lock.current = false; setBusy(false) }
  }
  return <SettingsCard title={t('deviceHistory.title')} description={t('deviceHistory.hint')}>
    <p className="text-xs text-fg-muted">{t('deviceHistory.limits')}</p>
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-fg-muted">{t('deviceHistory.chat')}
      <select className="h-10 w-full min-w-0 rounded-lg border border-border bg-bg px-3 text-sm text-fg"
        disabled={busy} value={selected} onChange={(event) => { setSelected(event.target.value); setPage(null) }}>
        <option value="">{t('deviceHistory.choose')}</option>
        {conversations.filter((item) => item.kind !== 'channel').map((item) => <option key={item.id} value={item.id}>{labels.rows.find((row) => row.conversation.id === item.id)?.title ?? item.title ?? t('chatList.unknownPeer')}</option>)}
      </select>
    </label>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" loading={busy} disabled={!selected} onClick={() => { void load(false) }}>{t('deviceHistory.load')}</Button>
      {page && !page.done ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => { void load(true) }}>{t('deviceHistory.older')}</Button> : null}
    </div>
    {page ? <p role="status" className="text-xs text-fg-muted">{t('deviceHistory.result', { added: page.stats.messages.length, existing: page.stats.existing, unavailable: page.stats.unavailable, ignored: page.stats.ignored })}</p> : null}
  </SettingsCard>
}
