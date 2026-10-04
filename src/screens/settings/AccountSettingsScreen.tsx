import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { setUsername } from '../../api/profile'
import { AvatarUploader } from '../../components/settings/AvatarUploader'
import { SettingsCard, SettingsRow } from '../../components/settings/Section'
import { StatusEditor } from '../../components/settings/StatusEditor'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useActiveAccount } from '../../hooks/useActiveAccount'
import { useCopy } from '../../hooks/useCopy'
import { useToast } from '../../hooks/useToast'
import { requireAccountStore } from '../../state/accountRegistry'
import type { Account } from '../../types'
import { MAX_USERNAME_LENGTH, validateUsername, type UsernameProblem } from '../../utils/username'
import { SettingsSectionScreen } from './SettingsSectionScreen'

const PROBLEM_KEYS = {
  empty: 'settings.account.nameEmpty',
  tooLong: 'settings.account.nameTooLong',
  invalid: 'settings.account.nameInvalid',
} as const satisfies Record<UsernameProblem, string>

/** The account's own face: picture, name, FH number and custom status. */
export function AccountSettingsScreen() {
  const { t } = useTranslation()
  const account = useActiveAccount()
  if (account === null) {
    return null
  }

  return (
    <SettingsSectionScreen section="account">
      <SettingsCard title={t('settings.account.profile')}>
        <AvatarUploader account={account} />
      </SettingsCard>
      {/* Remounted when the name changes, so the field never holds a stale value
          from before a save — its own or another tab's. */}
      <NameCard key={`${account.id}:${account.username}`} account={account} />
      <FhNumberCard account={account} />
      <StatusEditor account={account} />
    </SettingsSectionScreen>
  )
}

function NameCard({ account }: { account: Account }) {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('settings')

  const [value, setValue] = useState(account.username)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  const problem = validateUsername(value)
  const unchanged = value.trim() === account.username

  async function save(): Promise<void> {
    if (problem !== null) {
      setTouched(true)
      return
    }
    setBusy(true)
    try {
      const next = value.trim()
      await setUsername(account, next)
      await requireAccountStore(account.id).getState().actions.updateAccount({ username: next })
      toast.notify({ kind: 'success', message: t('settings.account.nameSaved') })
    } catch (cause) {
      fail(cause)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsCard title={t('settings.account.name')} description={t('settings.account.nameHint')}>
      {/* No row label: the card's own title is the label, and repeating it above
          the field would be the third time the same word appears. */}
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-48 flex-1">
          <Input
            label={t('settings.account.name')}
            hideLabel
            value={value}
            maxLength={MAX_USERNAME_LENGTH}
            autoComplete="nickname"
            error={touched && problem !== null ? t(PROBLEM_KEYS[problem]) : null}
            onBlur={() => {
              setTouched(true)
            }}
            onChange={(event) => {
              setValue(event.target.value)
            }}
          />
        </div>
        <Button
          loading={busy}
          disabled={problem !== null || unchanged}
          onClick={() => {
            void save()
          }}
        >
          {t('settings.save')}
        </Button>
      </div>
    </SettingsCard>
  )
}

function FhNumberCard({ account }: { account: Account }) {
  const { t } = useTranslation()
  const copy = useCopy()

  return (
    <SettingsCard title={t('settings.account.fhNumber')} description={t('settings.account.fhNumberHint')}>
      <SettingsRow label={account.fhNumber}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            void copy(account.fhNumber)
          }}
        >
          {t('settings.copy')}
        </Button>
      </SettingsRow>
    </SettingsCard>
  )
}
