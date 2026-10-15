import { X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listContacts } from '../../api/contacts'
import {
  addGroupAddException, getDmPolicy, getGroupAddPolicy, listGroupAddExceptions,
  removeGroupAddException, setDmPolicy, setGroupAddPolicy,
  type DmPolicy, type GroupAddPolicy,
} from '../../api/profile'
import { useAccountResource } from '../../hooks/useAccountResource'
import { useActionReporter } from '../../hooks/useActionReporter'
import type { Account } from '../../types'
import { Button } from '../ui/Button'
import { PanelError } from './PanelError'
import { PanelSkeleton } from './PanelSkeleton'
import { SettingsCard, SettingsChoice } from './Section'

export function ContactPoliciesPanel({ account }: { account: Account }) {
  const { t } = useTranslation()
  const dm = useAccountResource(account, getDmPolicy)
  const group = useAccountResource(account, getGroupAddPolicy)
  const fail = useActionReporter('contact-policies')
  const [busy, setBusy] = useState(false)
  const changing = useRef(false)
  async function save(policy: DmPolicy | GroupAddPolicy, kind: 'dm' | 'group'): Promise<void> {
    if (changing.current) return
    changing.current = true
    setBusy(true)
    try {
      if (kind === 'dm') {
        await setDmPolicy(account, policy as DmPolicy)
        dm.replace({ policy: policy as DmPolicy })
      } else {
        await setGroupAddPolicy(account, policy as GroupAddPolicy)
        group.replace({ policy: policy as GroupAddPolicy })
      }
    } catch (cause) { fail(cause) }
    finally { changing.current = false; setBusy(false) }
  }
  return (
    <>
      <SettingsCard title={t('settings.privacy.dmPolicy')} description={t('settings.privacy.dmPolicyHint')}>
        {dm.error !== null ? <PanelError message={dm.error} onRetry={dm.reload} />
          : dm.data === null ? <PanelSkeleton /> : (
            <SettingsChoice label={t('settings.privacy.dmPolicy')} value={dm.data.policy} disabled={busy}
              options={[
                { value: 'everyone', label: t('settings.privacy.everyone') },
                { value: 'contacts_only', label: t('settings.privacy.knownPeers') },
              ]} onChange={(policy) => { void save(policy, 'dm') }} />
          )}
      </SettingsCard>
      <SettingsCard title={t('settings.privacy.groupAddPolicy')} description={t('settings.privacy.groupAddPolicyHint')}>
        {group.error !== null ? <PanelError message={group.error} onRetry={group.reload} />
          : group.data === null ? <PanelSkeleton /> : (
            <>
              <SettingsChoice label={t('settings.privacy.groupAddPolicy')} value={group.data.policy} disabled={busy}
                options={[
                  { value: 'everyone', label: t('settings.privacy.everyone') },
                  { value: 'nobody', label: t('settings.privacy.exceptionsOnly') },
                ]} onChange={(policy) => { void save(policy, 'group') }} />
              {group.data.policy === 'nobody' ? <GroupAddExceptions key={account.id} account={account} /> : null}
            </>
          )}
      </SettingsCard>
    </>
  )
}

function GroupAddExceptions({ account }: { account: Account }) {
  const { t } = useTranslation()
  const exceptions = useAccountResource(account, listGroupAddExceptions)
  const contacts = useAccountResource(account, listContacts)
  const fail = useActionReporter('group-add-exceptions')
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const changing = useRef(false)
  async function change(accountId: string, remove: boolean): Promise<void> {
    if (changing.current || exceptions.data === null) return
    changing.current = true
    setBusy(true)
    try {
      if (remove) await removeGroupAddException(account, accountId)
      else await addGroupAddException(account, accountId)
      setTarget('')
      exceptions.reload()
    } catch (cause) { fail(cause) }
    finally { changing.current = false; setBusy(false) }
  }
  if (exceptions.error !== null) return <PanelError message={exceptions.error} onRetry={exceptions.reload} />
  if (exceptions.data === null) return <PanelSkeleton />
  const selected = new Set(exceptions.data.map((entry) => entry.accountId))
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <p className="text-xs text-fg-muted">{t('settings.privacy.groupExceptionsHint')}</p>
      {exceptions.data.length === 0 ? <p className="text-xs text-fg-muted">{t('settings.privacy.noExceptions')}</p> : (
        <ul className="flex flex-col gap-2">
          {exceptions.data.map((entry) => {
            const contact = contacts.data?.find((item) => item.targetAccountId === entry.accountId)
            return <li key={entry.accountId} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg p-2.5">
              <span className="truncate text-sm text-fg">{contact?.localUsername ?? contact?.username ?? t('chatList.unknownPeer')}</span>
              <Button variant="ghost" size="sm" disabled={busy} aria-label={t('settings.privacy.removeException')}
                onClick={() => { void change(entry.accountId, true) }}><X className="size-4" aria-hidden /></Button>
            </li>
          })}
        </ul>
      )}
      {contacts.error !== null ? <PanelError message={contacts.error} onRetry={contacts.reload} /> : (
        <>
          <label className="flex flex-col gap-1 text-xs font-medium text-fg-muted">
            {t('settings.privacy.addException')}
            <select value={target} disabled={busy || contacts.data === null}
              onChange={(event) => setTarget(event.target.value)}
              className="h-10 rounded-lg border border-border bg-bg px-3 text-sm text-fg focus-visible:outline-2 focus-visible:outline-accent">
              <option value="">{t('settings.privacy.pickContact')}</option>
              {(contacts.data ?? []).filter((entry) => !selected.has(entry.targetAccountId) && entry.targetAccountId !== account.id).map((entry) => (
                <option key={entry.targetAccountId} value={entry.targetAccountId}>{entry.localUsername ?? entry.username}</option>
              ))}
            </select>
          </label>
          <Button size="sm" className="self-start" loading={busy} disabled={target.length === 0 || selected.has(target)}
            onClick={() => { void change(target, false) }}>{t('settings.privacy.addException')}</Button>
        </>
      )}
    </div>
  )
}
