import { Check, Loader2 } from 'lucide-react'
import type { ParseKeys } from 'i18next'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { connectAccount, type ConnectStep } from '../auth/session'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useActiveAccount } from '../hooks/useActiveAccount'
import { useToast } from '../hooks/useToast'
import { ROUTES } from '../router/paths'
import { cn } from '../utils/cn'

/**
 * The step between signing in and reaching the app.
 *
 * A first sign-in on a device generates an identity and uploads a prekey pool —
 * a hundred keys, uploaded in batches — so this is not instant, and pretending
 * otherwise with a bare spinner would look like a hang. Restoring an existing
 * device passes through the same steps almost immediately.
 */
const STEPS: Array<{ id: ConnectStep; labelKey: ParseKeys }> = [
  { id: 'keys', labelKey: 'connect.stepKeys' },
  { id: 'socket', labelKey: 'connect.stepSocket' },
]

export function ConnectScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const account = useActiveAccount()

  const [step, setStep] = useState<ConnectStep | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  // Guards against React's development double-invocation running the whole
  // device initialisation twice.
  const startedRef = useRef(false)

  useEffect(() => {
    if (account === null) {
      void navigate(ROUTES.login, { replace: true })
      return
    }
    if (startedRef.current) {
      return
    }
    startedRef.current = true

    let cancelled = false
    setError(null)

    void connectAccount(account, (next) => {
      if (!cancelled) {
        setStep(next)
      }
    })
      .then(() => {
        if (!cancelled) {
          void navigate(ROUTES.app, { replace: true })
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return
        }
        const message = cause instanceof Error ? cause.message : String(cause)
        setError(message)
        console.error('[auth] preparing the account failed', cause)
      })

    return () => {
      cancelled = true
    }
  }, [account, navigate, attempt])

  if (account === null) {
    return null
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-bg px-5 py-10 text-fg">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-border bg-bg-elevated p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">{t('connect.title')}</h1>
          <p className="text-xs text-fg-muted">
            {t('connect.subtitle', { username: account.username })}
          </p>
        </div>

        <ol className="flex flex-col gap-3">
          {STEPS.map((entry) => {
            const state = stepState(entry.id, step, error !== null)
            return (
              <li key={entry.id} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border',
                    state === 'done' && 'border-online text-online',
                    state === 'active' && 'border-accent text-accent',
                    state === 'pending' && 'border-border text-fg-muted',
                  )}
                >
                  {state === 'done' ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : state === 'active' ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current" aria-hidden />
                  )}
                </span>
                <span className={state === 'pending' ? 'text-fg-muted' : 'text-fg'}>
                  {t(entry.labelKey)}
                </span>
              </li>
            )
          })}
        </ol>

        {error === null ? (
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <Spinner className="size-3.5" />
            {t('connect.pleaseWait')}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p role="alert" className="text-xs text-danger">
              {t('connect.failed')}
            </p>
            <p className="text-xs break-words text-fg-muted">{error}</p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setAttempt((value) => value + 1)
                }}
                className="flex-1"
              >
                {t('connect.retry')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  toast.notify({ kind: 'info', message: t('connect.offlineHint') })
                  void navigate(ROUTES.app, { replace: true })
                }}
              >
                {t('connect.continueOffline')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function stepState(
  id: ConnectStep,
  current: ConnectStep | null,
  failed: boolean,
): 'pending' | 'active' | 'done' {
  if (current === null) {
    return 'pending'
  }
  const order = STEPS.findIndex((entry) => entry.id === id)
  const currentOrder = STEPS.findIndex((entry) => entry.id === current)
  if (order < currentOrder || (order === currentOrder && failed)) {
    return 'done'
  }
  return order === currentOrder ? 'active' : 'pending'
}
