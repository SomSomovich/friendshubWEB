import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getMe } from '../../api/auth'
import { clearStatus, setStatus } from '../../api/profile'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import type { Account } from '../../types'
import { nowSeconds } from '../../utils/time'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { SettingsCard, SettingsChoice, SettingsRow } from './Section'

/** The custom status, and how long it lasts. */
export type TtlChoice = 'hour' | 'eightHours' | 'week' | 'forever'

const TTL_SECONDS: Record<Exclude<TtlChoice, 'forever'>, number> = {
  hour: 3_600,
  eightHours: 8 * 3_600,
  week: 7 * 24 * 3_600,
}

/** Longest status text the server accepts. */
const MAX_TEXT = 100
/** Longest emoji field the server accepts — which is one emoji, or a few. */
const MAX_EMOJI = 8

type FormState = {
  text: string
  emoji: string
  ttl: TtlChoice
}

const EMPTY_FORM: FormState = { text: '', emoji: '', ttl: 'forever' }

export function StatusEditor({ account }: { account: Account }) {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('settings')

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    // The account record keeps the username and the avatar but not the status,
    // so this reads it from `/me` — the only endpoint that returns it for the
    // account itself.
    void getMe(account)
      .then((me) => {
        if (!cancelled) {
          setForm({
            text: me.customStatusText ?? '',
            emoji: me.customStatusEmoji ?? '',
            ttl: ttlOf(me.customStatusExpiresAt),
          })
        }
      })
      .catch((error: unknown) => {
        console.warn('[settings] the custom status could not be read', error)
      })

    return () => {
      cancelled = true
    }
  }, [account])

  async function save(): Promise<void> {
    setBusy(true)
    try {
      await setStatus(account, {
        text: form.text.trim().length === 0 ? null : form.text.trim(),
        emoji: form.emoji.trim().length === 0 ? null : form.emoji.trim(),
        ttlSeconds: form.ttl === 'forever' ? null : TTL_SECONDS[form.ttl],
      })
      toast.notify({ kind: 'success', message: t('settings.account.statusSaved') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  async function reset(): Promise<void> {
    setBusy(true)
    try {
      await clearStatus(account)
      setForm(EMPTY_FORM)
      toast.notify({ kind: 'success', message: t('settings.account.statusCleared') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  const isEmpty = form.text.trim().length === 0 && form.emoji.trim().length === 0

  return (
    <SettingsCard title={t('settings.account.status')} description={t('settings.account.statusHint')}>
      <SettingsRow label={t('settings.account.statusText')} stacked>
        <Input
          label={t('settings.account.statusText')}
          hideLabel
          value={form.text}
          maxLength={MAX_TEXT}
          placeholder={t('settings.account.statusPlaceholder')}
          onChange={(event) => {
            setForm({ ...form, text: event.target.value })
          }}
        />
      </SettingsRow>

      <SettingsRow label={t('settings.account.statusEmoji')} description={t('settings.account.statusEmojiHint')} stacked>
        <Input
          label={t('settings.account.statusEmoji')}
          hideLabel
          value={form.emoji}
          maxLength={MAX_EMOJI}
          placeholder="💻"
          onChange={(event) => {
            setForm({ ...form, emoji: event.target.value })
          }}
        />
      </SettingsRow>

      <SettingsRow label={t('settings.account.statusTtl')} stacked>
        <SettingsChoice
          label={t('settings.account.statusTtl')}
          value={form.ttl}
          onChange={(ttl) => {
            setForm({ ...form, ttl })
          }}
          options={[
            { value: 'hour', label: t('mute.hour') },
            { value: 'eightHours', label: t('mute.eightHours') },
            { value: 'week', label: t('mute.week') },
            { value: 'forever', label: t('mute.forever') },
          ]}
        />
      </SettingsRow>

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Button
          loading={busy}
          disabled={isEmpty}
          onClick={() => {
            void save()
          }}
        >
          {t('settings.account.statusSave')}
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            void reset()
          }}
        >
          {t('settings.account.statusClear')}
        </Button>
      </div>
    </SettingsCard>
  )
}

/**
 * Which of the offered durations an existing expiry corresponds to.
 *
 * The server stores an absolute moment and the form offers durations, so a
 * status set a week ago comes back as "a week" only because the difference still
 * rounds to it; anything else falls back to "forever", which is the option that
 * would produce the same expiry on the next save.
 */
function ttlOf(expiresAt: number | null): TtlChoice {
  if (expiresAt === null) {
    return 'forever'
  }
  const remaining = expiresAt - nowSeconds()
  if (remaining <= 0) {
    return 'forever'
  }
  if (remaining <= TTL_SECONDS.hour) {
    return 'hour'
  }
  if (remaining <= TTL_SECONDS.eightHours) {
    return 'eightHours'
  }
  if (remaining <= TTL_SECONDS.week) {
    return 'week'
  }
  return 'forever'
}
