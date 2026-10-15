import { Bot, KeyRound, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createBot, deleteBot, listBots, rotateBotToken, setBotHandle, type ManagedBot } from '../../api/bots'
import { handleFeedback } from '../../components/create/handleMessage'
import { PanelError } from '../../components/settings/PanelError'
import { PanelSkeleton } from '../../components/settings/PanelSkeleton'
import { SettingsCard } from '../../components/settings/Section'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { useAccountResource } from '../../hooks/useAccountResource'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useActiveAccount } from '../../hooks/useActiveAccount'
import { useCopy } from '../../hooks/useCopy'
import { useHandleAvailability } from '../../hooks/useHandleAvailability'
import type { Account } from '../../types'
import { normalizeHandle } from '../../utils/handle'
import { SettingsSectionScreen } from './SettingsSectionScreen'

export function BotsSettingsScreen() {
  const account = useActiveAccount()
  return account === null ? null : <BotsPanel key={account.id} account={account} />
}
function BotsPanel({ account }: { account: Account }) {
  const { t } = useTranslation()
  const resource = useAccountResource(account, listBots)
  const fail = useActionReporter('manage-bots')
  const copy = useCopy()
  const [token, setToken] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'rotate' | 'delete'; bot: ManagedBot } | null>(null)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  async function mutate(kind: 'create' | 'rotate' | 'delete', bot?: ManagedBot): Promise<void> {
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    try {
      if (kind === 'create') setToken((await createBot(account)).token)
      else if (bot !== undefined && kind === 'rotate') setToken((await rotateBotToken(account, bot.id)).token)
      else if (bot !== undefined) await deleteBot(account, bot.id)
      setConfirm(null)
      resource.reload()
    } catch (cause) { fail(cause) }
    finally { submitting.current = false; setBusy(false) }
  }
  return <SettingsSectionScreen section="bots">
    <SettingsCard title={t('bots.manage.title')} description={t('bots.manage.hint')}>
      <Button className="self-start" loading={busy} disabled={resource.data === null || resource.data.length >= 20}
        onClick={() => { void mutate('create') }}><Bot className="size-4" aria-hidden />{t('bots.manage.create')}</Button>
      {resource.error !== null ? <PanelError message={resource.error} onRetry={resource.reload} />
        : resource.data === null ? <PanelSkeleton /> : resource.data.length === 0
          ? <p className="text-xs text-fg-muted">{t('bots.manage.empty')}</p>
          : <div className="flex flex-col gap-3">{resource.data.map((bot) => (
            <div key={bot.id} className="flex flex-col gap-2 rounded-lg border border-border bg-bg p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-fg">{bot.handle ? `@${bot.handle}` : t('bots.manage.unnamed')}</span>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" disabled={busy} aria-label={t('bots.manage.rotate')}
                    onClick={() => setConfirm({ kind: 'rotate', bot })}><KeyRound className="size-4" aria-hidden /></Button>
                  <Button variant="ghost" size="sm" disabled={busy} aria-label={t('bots.manage.delete')}
                    onClick={() => setConfirm({ kind: 'delete', bot })}><Trash2 className="size-4 text-danger" aria-hidden /></Button>
                </div>
              </div>
              <p className="text-xs text-fg-muted">{t('bots.manage.prefix', { prefix: bot.tokenPrefix })}</p>
              <BotHandleEditor account={account} bot={bot} disabled={busy} onSaved={resource.reload} />
            </div>
          ))}</div>}
    </SettingsCard>
    <ConfirmDialog open={confirm !== null} danger busy={busy}
      title={t(confirm?.kind === 'rotate' ? 'bots.manage.rotate' : 'bots.manage.delete')}
      description={t(confirm?.kind === 'rotate' ? 'bots.manage.rotateHint' : 'bots.manage.deleteHint')}
      confirmLabel={t(confirm?.kind === 'rotate' ? 'bots.manage.rotate' : 'bots.manage.delete')}
      onConfirm={() => { if (confirm) void mutate(confirm.kind, confirm.bot) }}
      onClose={() => { if (!submitting.current) setConfirm(null) }} />
    <Modal open={token !== null} title={t('bots.manage.tokenTitle')} onClose={() => setToken(null)} footer={
      <Button onClick={() => setToken(null)}>{t('common.close')}</Button>
    }>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-fg-muted">{t('bots.manage.tokenHint')}</p>
        <Input type="password" label={t('bots.manage.tokenTitle')} value={token ?? ''} readOnly autoComplete="off" />
        <Button variant="secondary" className="self-start" onClick={() => { if (token) void copy(token) }}>{t('settings.copy')}</Button>
      </div>
    </Modal>
  </SettingsSectionScreen>
}

function BotHandleEditor({ account, bot, disabled, onSaved }: {
  account: Account; bot: ManagedBot; disabled: boolean; onSaved: () => void
}) {
  const { t } = useTranslation()
  const fail = useActionReporter('bot-handle')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const handle = normalizeHandle(value)
  const check = useHandleAvailability(account, value, !disabled && handle.length > 0, 'bot')
  const feedback = handleFeedback(check, t)
  const ready = check.state === 'available' || check.state === 'unknown'
  async function save(): Promise<void> {
    if (submitting.current || !ready || disabled) return
    submitting.current = true
    setBusy(true)
    try { await setBotHandle(account, bot.id, handle); onSaved() }
    catch (cause) { fail(cause) }
    finally { submitting.current = false; setBusy(false) }
  }
  return <div className="flex flex-wrap items-end gap-2">
    <div className="min-w-40 flex-1"><Input label={t('bots.manage.handle')} value={value} placeholder={bot.handle ?? 'my_example_bot'}
      disabled={busy || disabled} maxLength={32} autoComplete="off" spellCheck={false}
      error={feedback.error ? feedback.message : null} helper={feedback.error ? null : feedback.message}
      onChange={(event) => setValue(event.target.value)} /></div>
    <Button size="sm" loading={busy} disabled={!ready || disabled} onClick={() => { void save() }}>{t('settings.save')}</Button>
  </div>
}
