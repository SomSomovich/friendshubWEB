import { UserMinus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  listBlocks,
  listContacts,
  unblockAccount,
  type BlockedAccount,
  type Contact,
} from '../../api/contacts'
import {
  addPresenceException,
  listPresenceExceptions,
  removePresenceException,
  setInvisible,
  type PresenceException,
  type PresenceExceptionKind,
} from '../../api/profile'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import { readInvisibleMirror, writeInvisibleMirror } from '../../storage/app_settings'
import type { Account } from '../../types'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { SettingsCard, SettingsChoice, SettingsRow, SettingsToggle } from './Section'

/**
 * Invisible mode.
 *
 * The toggle remembers what this device last set rather than reading the value:
 * the server stores the flag but nothing returns it — `GET /me` carries the
 * username, the avatar and the custom status, and not this — so the screen says
 * what it is showing instead of implying it read it back.
 */
export function InvisiblePanel({ account }: { account: Account }) {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('privacy')

  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void readInvisibleMirror(account.id).then((value) => {
      if (!cancelled) {
        setEnabled(value)
      }
    })
    return () => {
      cancelled = true
    }
  }, [account.id])

  async function toggle(next: boolean): Promise<void> {
    setBusy(true)
    try {
      await setInvisible(account, next)
      await writeInvisibleMirror(account.id, next)
      setEnabled(next)
      toast.notify({
        kind: 'success',
        message: next ? t('settings.privacy.invisibleOn') : t('settings.privacy.invisibleOff'),
      })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsCard title={t('settings.privacy.invisible')} description={t('settings.privacy.invisibleHint')}>
      <SettingsRow label={t('settings.privacy.invisible')} description={t('settings.privacy.invisibleNote')}>
        {enabled === null ? (
          <Spinner className="size-4 text-fg-muted" />
        ) : (
          <SettingsToggle
            label={t('settings.privacy.invisible')}
            checked={enabled}
            disabled={busy}
            onChange={(next) => {
              void toggle(next)
            }}
          />
        )}
      </SettingsRow>
    </SettingsCard>
  )
}

/**
 * Who sees this account's presence regardless of the invisible mode.
 *
 * Targets are picked from the contact list: the endpoint takes an account id,
 * and a raw id is not something a person can supply.
 */
export function PresenceExceptionsPanel({ account }: { account: Account }) {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('privacy')

  const [exceptions, setExceptions] = useState<PresenceException[] | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [target, setTarget] = useState('')
  const [kind, setKind] = useState<PresenceExceptionKind>('always_visible')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let cancelled = false

    void Promise.all([
      listPresenceExceptions(account),
      // A failure here costs the picker, not the list; the exceptions themselves
      // are what this panel exists for.
      listContacts(account).catch((): Contact[] => []),
    ])
      .then(([loaded, contactList]) => {
        if (!cancelled) {
          setExceptions(loaded)
          setContacts(contactList)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          fail(error)
        }
      })

    return () => {
      cancelled = true
    }
  }, [account, revision, fail])

  async function add(): Promise<void> {
    if (target.length === 0) {
      return
    }
    setBusy(true)
    try {
      await addPresenceException(account, { targetAccountId: target, kind })
      setTarget('')
      setRevision((value) => value + 1)
      toast.notify({ kind: 'success', message: t('settings.privacy.exceptionAdded') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  async function remove(exception: PresenceException): Promise<void> {
    setBusy(true)
    try {
      await removePresenceException(account, {
        targetAccountId: exception.targetAccountId,
        kind: exception.kind,
      })
      setRevision((value) => value + 1)
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsCard title={t('settings.privacy.exceptions')} description={t('settings.privacy.exceptionsHint')}>
      {exceptions === null ? (
        <div className="flex justify-center py-4">
          <Spinner className="size-4 text-fg-muted" />
        </div>
      ) : exceptions.length === 0 ? (
        <p className="text-xs text-fg-muted">{t('settings.privacy.noExceptions')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {exceptions.map((exception) => (
            <li
              key={`${exception.targetAccountId}:${exception.kind}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg p-2.5"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-fg">
                  {nameOf(contacts, exception.targetAccountId, t('chatList.unknownPeer'))}
                </span>
                <span className="text-xs text-fg-muted">
                  {exception.kind === 'always_visible'
                    ? t('settings.privacy.alwaysVisible')
                    : t('settings.privacy.alwaysInvisible')}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                aria-label={t('settings.privacy.removeException')}
                onClick={() => {
                  void remove(exception)
                }}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-fg-muted">
          {t('settings.privacy.addException')}
          <select
            value={target}
            onChange={(event) => {
              setTarget(event.target.value)
            }}
            className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <option value="">{t('settings.privacy.pickContact')}</option>
            {contacts.map((contact) => (
              <option key={contact.targetAccountId} value={contact.targetAccountId}>
                {contact.localUsername ?? contact.username}
              </option>
            ))}
          </select>
        </label>

        <SettingsChoice
          label={t('settings.privacy.exceptionKind')}
          value={kind}
          onChange={setKind}
          options={[
            { value: 'always_visible', label: t('settings.privacy.alwaysVisible') },
            { value: 'always_invisible', label: t('settings.privacy.alwaysInvisible') },
          ]}
        />

        <Button
          size="sm"
          className="self-start"
          loading={busy}
          disabled={target.length === 0 || contacts.length === 0}
          onClick={() => {
            void add()
          }}
        >
          {t('settings.privacy.addException')}
        </Button>
      </div>
    </SettingsCard>
  )
}

/** The blocked accounts, and the one thing there is to do about them. */
export function BlockedPanel({ account }: { account: Account }) {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('privacy')

  const [blocked, setBlocked] = useState<BlockedAccount[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let cancelled = false

    void listBlocks(account)
      .then((loaded) => {
        if (!cancelled) {
          setBlocked(loaded)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          fail(error)
        }
      })

    return () => {
      cancelled = true
    }
  }, [account, revision, fail])

  async function unblock(entry: BlockedAccount): Promise<void> {
    setBusyId(entry.accountId)
    try {
      await unblockAccount(account, entry.accountId)
      setRevision((value) => value + 1)
      toast.notify({ kind: 'success', message: t('settings.privacy.unblocked') })
    } catch (error) {
      fail(error)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <SettingsCard title={t('settings.privacy.blocked')} description={t('settings.privacy.blockedHint')}>
      {blocked === null ? (
        <div className="flex justify-center py-4">
          <Spinner className="size-4 text-fg-muted" />
        </div>
      ) : blocked.length === 0 ? (
        <p className="text-xs text-fg-muted">{t('settings.privacy.noBlocked')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {blocked.map((entry) => (
            <li
              key={entry.accountId}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg p-2.5"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-fg">{entry.username}</span>
                <span className="truncate text-xs text-fg-muted">{entry.fhNumber}</span>
              </span>
              <Button
                variant="secondary"
                size="sm"
                loading={busyId === entry.accountId}
                onClick={() => {
                  void unblock(entry)
                }}
              >
                <UserMinus className="size-4" aria-hidden />
                {t('settings.privacy.unblock')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  )
}

function nameOf(contacts: Contact[], accountId: string, fallback: string): string {
  const contact = contacts.find((entry) => entry.targetAccountId === accountId)
  return contact?.localUsername ?? contact?.username ?? fallback
}
