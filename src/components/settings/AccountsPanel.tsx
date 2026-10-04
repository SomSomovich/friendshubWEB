import { Check, UserRoundPlus, UserRoundX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { avatarImageUrl } from '../../api/avatars'
import { forgetAccount, signOutAccount } from '../../auth/session'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import { addAccountPath } from '../../router/paths'
import { useUiStore } from '../../state/uiStore'
import { listAccounts } from '../../storage/accounts'
import type { Account } from '../../types'
import { cn } from '../../utils/cn'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Spinner } from '../ui/Spinner'
import { SettingsCard } from './Section'

/** The multi-account model allows five per browser tab (brief §8). */
const MAX_ACCOUNTS = 5

/**
 * The accounts signed in to this browser.
 *
 * Removing one is not the same as logging out: it revokes the session and then
 * purges everything this browser holds for that account — its messages, its
 * keys, its conversations — which is what makes it different from switching.
 */
export function AccountsPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const fail = useActionReporter('accounts')

  const activeAccountId = useUiStore((state) => state.activeAccountId)
  const setActiveAccount = useUiStore((state) => state.setActiveAccount)

  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, setPending] = useState<Account | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let cancelled = false

    void listAccounts()
      .then((rows) => {
        if (!cancelled) {
          setAccounts(rows)
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
  }, [revision, fail])

  async function remove(account: Account): Promise<void> {
    setBusyId(account.id)
    try {
      await signOutAccount(account)
      setPending(null)
      setRevision((value) => value + 1)
      toast.notify({ kind: 'success', message: t('settings.accounts.removed') })
    } catch (error) {
      // `signOutAccount` only ever fails on the local purge; the account may
      // already be half gone, so a reload is the honest response either way.
      fail(error)
      await forgetAccount(account).catch(() => undefined)
      setRevision((value) => value + 1)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <SettingsCard title={t('settings.accounts.title')} description={t('settings.accounts.hint')}>
      {accounts === null ? (
        <div className="flex justify-center py-4">
          <Spinner className="size-4 text-fg-muted" />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {accounts.map((account) => {
            const isActive = account.id === activeAccountId
            return (
              <li
                key={account.id}
                className={cn(
                  'flex flex-wrap items-center gap-2 rounded-lg border p-2.5',
                  isActive ? 'border-accent bg-bg' : 'border-border bg-bg',
                )}
              >
                <Avatar name={account.username} src={avatarImageUrl(account.id)} size="md" />

                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-fg">{account.username}</span>
                  <span className="truncate text-xs text-fg-muted">{account.fhNumber}</span>
                </span>

                {isActive ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-accent">
                    <Check className="size-4" aria-hidden />
                    {t('settings.accounts.active')}
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setActiveAccount(account.id)
                    }}
                  >
                    {t('settings.accounts.switch')}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  loading={busyId === account.id}
                  disabled={busyId !== null}
                  aria-label={t('settings.accounts.remove')}
                  onClick={() => {
                    setPending(account)
                  }}
                >
                  <UserRoundX className="size-4" aria-hidden />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {accounts !== null && accounts.length < MAX_ACCOUNTS ? (
        <div className="border-t border-border pt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void navigate(addAccountPath())
            }}
          >
            <UserRoundPlus className="size-4" aria-hidden />
            {t('settings.accounts.add')}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        title={t('settings.accounts.remove')}
        description={t('settings.accounts.removeHint', { name: pending?.username ?? '' })}
        confirmLabel={t('settings.accounts.remove')}
        danger
        busy={busyId !== null}
        onConfirm={() => {
          if (pending !== null) {
            void remove(pending)
          }
        }}
        onClose={() => {
          setPending(null)
        }}
      />
    </SettingsCard>
  )
}
