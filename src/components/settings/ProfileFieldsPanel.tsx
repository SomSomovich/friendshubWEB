import { Plus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getProfileFields, setProfileFields, type ProfileField } from '../../api/profile'
import { useAccountResource } from '../../hooks/useAccountResource'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import type { Account } from '../../types'
import { MAX_PROFILE_FIELDS, validProfileFields } from '../../utils/profileFields'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { PanelError } from './PanelError'
import { PanelSkeleton } from './PanelSkeleton'
import { SettingsCard } from './Section'

export function ProfileFieldsPanel({ account }: { account: Account }) {
  const { t } = useTranslation()
  const resource = useAccountResource(account, getProfileFields)
  return (
    <SettingsCard title={t('settings.profileFields.title')} description={t('settings.profileFields.hint')}>
      {resource.error !== null ? <PanelError message={resource.error} onRetry={resource.reload} />
        : resource.data === null ? <PanelSkeleton />
          : <FieldsEditor key={account.id} account={account} fields={resource.data.fields} />}
    </SettingsCard>
  )
}

function FieldsEditor({ account, fields }: { account: Account; fields: ProfileField[] }) {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('profile-fields')
  const [rows, setRows] = useState(() => fields.map((field) => ({ ...field, id: crypto.randomUUID() })))
  const [saved, setSaved] = useState(fields)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const values = rows.map(({ label, value }) => ({ label: label.trim(), value: value.trim() }))
  const valid = validProfileFields(rows)
  const unchanged = JSON.stringify(values) === JSON.stringify(saved)

  async function save(): Promise<void> {
    if (submitting.current || !valid || unchanged) return
    submitting.current = true
    setBusy(true)
    try {
      await setProfileFields(account, values)
      setSaved(values)
      setRows((current) => current.map((row) => ({ ...row, label: row.label.trim(), value: row.value.trim() })))
      toast.notify({ kind: 'success', message: t('settings.profileFields.saved') })
    } catch (cause) { fail(cause) }
    finally { submitting.current = false; setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => (
        <div key={row.id} className="flex items-start gap-2 rounded-lg border border-border p-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <Input label={t('settings.profileFields.label', { index: index + 1 })} value={row.label}
              disabled={busy} onChange={(event) => {
                const label = event.target.value
                setRows((current) => current.map((entry) => entry.id === row.id ? { ...entry, label } : entry))
              }} />
            <Input label={t('settings.profileFields.value', { index: index + 1 })} value={row.value}
              disabled={busy} onChange={(event) => {
                const value = event.target.value
                setRows((current) => current.map((entry) => entry.id === row.id ? { ...entry, value } : entry))
              }} />
          </div>
          <Button variant="ghost" size="sm" disabled={busy} aria-label={t('settings.profileFields.remove')}
            onClick={() => setRows((current) => current.filter((entry) => entry.id !== row.id))}>
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      ))}
      {!valid ? <p role="alert" className="text-xs text-danger">{t('settings.profileFields.invalid')}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={busy || rows.length >= MAX_PROFILE_FIELDS}
          onClick={() => setRows((current) => [...current, { id: crypto.randomUUID(), label: '', value: '' }])}>
          <Plus className="size-4" aria-hidden />{t('settings.profileFields.add')}
        </Button>
        <Button size="sm" loading={busy} disabled={!valid || unchanged} onClick={() => { void save() }}>
          {t('settings.save')}
        </Button>
      </div>
    </div>
  )
}
