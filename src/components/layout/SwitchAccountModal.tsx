import { Check, UserRoundPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { useToast } from '../../hooks/useToast'
import { addAccountPath } from '../../router/paths'
import { useUiStore } from '../../state/uiStore'
import { listAccounts } from '../../storage/accounts'
import type { Account } from '../../types'
import { cn } from '../../utils/cn'

/** The multi-account model allows five per browser tab (brief §8). */
const MAX_ACCOUNTS = 5

export type SwitchAccountModalProps = {
  open: boolean
  onClose: () => void
}

/**
 * Lists the signed-in accounts and switches between them.
 *
 * Switching only changes which account the UI is showing; the connection handover
 * belongs to the login flow, which owns the socket's lifetime.
 */
export function SwitchAccountModal({ open, onClose }: SwitchAccountModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const activeAccountId = useUiStore((state) => state.activeAccountId)
  const setActiveAccount = useUiStore((state) => state.setActiveAccount)
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    // Deliberately no reset to `null` first: the previous list stays on screen
    // while the fresh one is read, which is calmer than a spinner between two
    // near-identical lists.
    void listAccounts()
      .then((rows) => {
        if (!cancelled) {
          setAccounts(rows)
          setError(null)
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return
        }
        setError(cause instanceof Error ? cause.message : String(cause))
        console.error('[accounts] could not read the stored accounts', cause)
      })

    return () => {
      cancelled = true
    }
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('accounts.title')}
      footer={
        accounts !== null && accounts.length < MAX_ACCOUNTS ? (
          <Button
            variant="secondary"
            onClick={() => {
              onClose()
              void navigate(addAccountPath())
            }}
          >
            <UserRoundPlus className="size-4" aria-hidden />
            {t('accounts.add')}
          </Button>
        ) : null
      }
    >
      {accounts === null && error === null ? (
        <div className="flex justify-center py-6">
          <Spinner className="text-fg-muted" />
        </div>
      ) : null}

      {error !== null ? (
        <p role="alert" className="text-sm text-danger">
          {t('accounts.loadFailed')}
        </p>
      ) : null}

      {accounts !== null ? (
        <ul className="flex flex-col gap-1">
          {accounts.map((account) => {
            const isActive = account.id === activeAccountId
            return (
              <li key={account.id}>
                <button
                  type="button"
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => {
                    setActiveAccount(account.id)
                    toast.notify({ kind: 'success', message: t('accounts.switched', { name: account.username }) })
                    onClose()
                  }}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-150',
                    'hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                    isActive && 'bg-bg-hover',
                  )}
                >
                  <Avatar name={account.username} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">
                      {account.username}
                    </span>
                    <span className="block truncate text-xs text-fg-muted">{account.fhNumber}</span>
                  </span>
                  {isActive ? <Check className="size-4 shrink-0 text-accent" aria-hidden /> : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {accounts !== null && accounts.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('accounts.empty')}</p>
      ) : null}
    </Modal>
  )
}
