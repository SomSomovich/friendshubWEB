import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
import { setChannelHandle } from '../../api/channels'
import { setGroupHandle } from '../../api/groups'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useHandleAvailability, type HandleCheck } from '../../hooks/useHandleAvailability'
import { useToast } from '../../hooks/useToast'
import type { Account } from '../../types'
import { MAX_HANDLE_LENGTH, normalizeHandle } from '../../utils/handle'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { SettingsCard } from '../settings/Section'

export type ConversationHandlePanelProps = {
  account: Account
  conversationId: string
  kind: 'group' | 'channel'
  /** What this device last set; the server never returns the current handle. */
  current: string | null
  onSaved: (handle: string) => void
}

/**
 * The group's or channel's handle — the name it is found by.
 *
 * There is no way to read the current one back: `POST /groups/{id}/profile`
 * sets it and returns it, and nothing else mentions it. So the field starts
 * empty (setting a new handle replaces the old one) and the line above it says
 * what this device last set, rather than an empty box pretending the group has
 * no handle.
 */
export function ConversationHandlePanel({
  account,
  conversationId,
  kind,
  current,
  onSaved,
}: ConversationHandlePanelProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('conversation')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  const check = useHandleAvailability(account, value, value.trim().length > 0)
  const handle = normalizeHandle(value)
  // An unverified handle is allowed through, exactly as in the creation wizard:
  // availability is a courtesy and the server is the authority.
  const ready = handle.length > 0 && (check.state === 'available' || check.state === 'unknown')

  async function save(): Promise<void> {
    setBusy(true)
    try {
      const result =
        kind === 'group'
          ? await setGroupHandle(account, conversationId, handle)
          : await setChannelHandle(account, conversationId, handle)
      onSaved(result.handle)
      setValue('')
      toast.notify({ kind: 'success', message: t('conversation.handle.saved') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsCard title={t('conversation.handle.title')} description={t('conversation.handle.description')}>
      <p className="text-xs text-fg-muted">
        {current === null
          ? t('conversation.handle.none')
          : t('conversation.handle.current', { handle: `@${current}` })}
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <Input
            label={t('conversation.handle.title')}
            hideLabel
            value={value}
            maxLength={MAX_HANDLE_LENGTH}
            autoComplete="off"
            placeholder={current ?? ''}
            error={fieldError(check, t)}
            helper={fieldHelper(check, t)}
            onChange={(event) => {
              setValue(event.target.value)
            }}
          />
        </div>
        <Button
          loading={busy}
          disabled={!ready}
          onClick={() => {
            void save()
          }}
        >
          {t('conversation.handle.save')}
        </Button>
      </div>

      <p className="text-xs text-pretty text-fg-muted">{t('conversation.handle.note')}</p>
    </SettingsCard>
  )
}

/** The problems worth colouring red: a shape the server would reject. */
function fieldError(check: HandleCheck, t: (key: ParseKeys) => string): string | null {
  if (check.state === 'invalid') {
    return t(`create.handleError.${check.problem}`)
  }
  return check.state === 'taken' ? t('create.handleError.taken') : null
}

function fieldHelper(check: HandleCheck, t: (key: ParseKeys) => string): string | null {
  switch (check.state) {
    case 'checking':
      return t('create.handleError.checking')
    case 'available':
      return t('create.handleError.available')
    case 'unknown':
      return t('create.handleError.unknown')
    default:
      return null
  }
}
