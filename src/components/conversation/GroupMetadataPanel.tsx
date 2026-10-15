import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { updateGroup, type GroupDetail } from '../../api/groups'
import { useActionReporter } from '../../hooks/useActionReporter'
import type { Account } from '../../types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { SettingsCard, SettingsRow, SettingsToggle } from '../settings/Section'

export function GroupMetadataPanel({ account, group, isOwner, onChanged }: {
  account: Account; group: GroupDetail; isOwner: boolean; onChanged: () => void
}) {
  const { t } = useTranslation()
  const fail = useActionReporter('group-profile')
  const [title, setTitle] = useState(group.title)
  const [description, setDescription] = useState(group.description ?? '')
  const [isPublic, setPublic] = useState(group.isPublic)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const valid = title.trim().length > 0 && [...title.trim()].length <= 128 && [...description].length <= 512
  const unchanged = title.trim() === group.title && description === (group.description ?? '') && isPublic === group.isPublic
  async function save(): Promise<void> {
    if (submitting.current || !valid || unchanged) return
    submitting.current = true
    setBusy(true)
    try {
      await updateGroup(account, group.conversationId, { title: title.trim(), description, ...(isOwner ? { isPublic } : {}) })
      onChanged()
    } catch (cause) { fail(cause) }
    finally { submitting.current = false; setBusy(false) }
  }
  return <SettingsCard title={t('conversation.management.profile')}>
    <Input label={t('conversation.management.name')} value={title} disabled={busy} onChange={(event) => setTitle(event.target.value)} />
    <Textarea label={t('conversation.management.description')} value={description} disabled={busy} onChange={(event) => setDescription(event.target.value)} />
    {isOwner ? <SettingsRow label={t('conversation.management.public')}>
      <SettingsToggle label={t('conversation.management.public')} checked={isPublic} disabled={busy} onChange={setPublic} />
    </SettingsRow> : null}
    {!valid ? <p role="alert" className="text-xs text-danger">{t('conversation.management.invalid')}</p> : null}
    <Button className="self-start" size="sm" loading={busy} disabled={!valid || unchanged} onClick={() => { void save() }}>{t('settings.save')}</Button>
  </SettingsCard>
}
