import { Compass } from 'lucide-react'
import { useCallback, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getChannelByHandle, listPublicChannels, subscribeChannel } from '../api/channels'
import { getGroupByHandle, joinGroup, listPublicGroups } from '../api/groups'
import { conversationAvatarUrl } from '../api/avatars'
import { ScreenHeader } from '../components/layout/ScreenHeader'
import { PanelError } from '../components/settings/PanelError'
import { PanelSkeleton } from '../components/settings/PanelSkeleton'
import { SettingsChoice } from '../components/settings/Section'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { useAccountResource } from '../hooks/useAccountResource'
import { useActionReporter } from '../hooks/useActionReporter'
import { useActiveAccount } from '../hooks/useActiveAccount'
import { chatPath, ROUTES } from '../router/paths'
import { requireAccountStore } from '../state/accountRegistry'
import type { Account } from '../types'
import { normalizeHandle, validateHandle } from '../utils/handle'

type Entry = { conversationId: string; title: string; description: string | null; memberCount: number }
export function DiscoverScreen() {
  const account = useActiveAccount()
  const [kind, setKind] = useState<'group' | 'channel'>('group')
  const { t } = useTranslation()
  const navigate = useNavigate()
  return <div className="flex min-h-0 flex-1 flex-col bg-bg text-fg">
    <ScreenHeader title={t('discover.title')} onBack={() => { void navigate(ROUTES.app) }} backMode="always" />
    <div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <SettingsChoice label={t('discover.kind')} value={kind} options={[
        { value: 'group', label: t('search.sections.groups') }, { value: 'channel', label: t('search.sections.channels') },
      ]} onChange={setKind} />
      {account === null ? null : <Directory key={`${account.id}:${kind}`} account={account} kind={kind} />}
    </div></div>
  </div>
}
function Directory({ account, kind }: { account: Account; kind: 'group' | 'channel' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fail = useActionReporter('discover')
  const load = useCallback((current: Account): Promise<Entry[]> => kind === 'group'
    ? listPublicGroups(current, 200) : listPublicChannels(current, 200), [kind])
  const resource = useAccountResource(account, load, kind)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Entry[] | null>(null)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const handle = normalizeHandle(query.replace(/^@/, ''))
  const eligible = validateHandle(handle) === null
  async function lookup(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (submitting.current || !eligible) return
    submitting.current = true
    setBusy(true)
    setLookupError(null)
    try {
      const entry = await (kind === 'group' ? getGroupByHandle : getChannelByHandle)(account, handle)
      setFound([entry])
    } catch (cause) {
      setFound([])
      setLookupError(cause instanceof Error ? cause.message : String(cause))
    } finally { submitting.current = false; setBusy(false) }
  }
  async function open(entry: Entry): Promise<void> {
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    try {
      const store = requireAccountStore(account.id)
      if (!store.getState().conversations.some((conversation) => conversation.id === entry.conversationId)) {
        await (kind === 'group' ? joinGroup : subscribeChannel)(account, entry.conversationId)
        await store.getState().actions.loadConversations()
      }
      void navigate(chatPath(entry.conversationId))
    } catch (cause) { fail(cause) }
    finally { submitting.current = false; setBusy(false) }
  }
  const entries = found ?? resource.data
  return <>
    <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { void lookup(event) }}>
      <div className="min-w-40 flex-1"><Input label={t('discover.handle')} value={query} disabled={busy} maxLength={33}
        placeholder="@example" onChange={(event) => setQuery(event.target.value)} autoComplete="off" spellCheck={false} /></div>
      <Button type="submit" size="sm" loading={busy} disabled={!eligible}>{t('discover.find')}</Button>
      {found !== null ? <Button variant="secondary" size="sm" disabled={busy}
        onClick={() => { setFound(null); setLookupError(null); setQuery('') }}>{t('discover.all')}</Button> : null}
    </form>
    {lookupError ? <p role="alert" className="text-sm text-fg-muted">{lookupError}</p>
      : found === null && resource.error !== null ? <PanelError message={resource.error} onRetry={resource.reload} />
        : entries === null ? <PanelSkeleton rows={4} /> : entries.length === 0
          ? <EmptyState icon={Compass} title={t('discover.empty')} />
          : <ul className="flex flex-col gap-2">{entries.map((entry) => (
            <li key={entry.conversationId} className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated p-3">
              <Avatar name={entry.title} src={conversationAvatarUrl(entry.conversationId)} size="md" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-sm font-medium text-fg">{entry.title}</p>
                {entry.description ? <p className="line-clamp-2 text-xs text-fg-muted break-words">{entry.description}</p> : null}
                <p className="text-xs text-fg-muted">{t(kind === 'group' ? 'conversation.memberCount' : 'conversation.subscriberCount', { count: entry.memberCount })}</p>
              </div>
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => { void open(entry) }}>{t('discover.open')}</Button>
            </li>
          ))}</ul>}
  </>
}
