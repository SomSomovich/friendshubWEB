import { useState, type FormEvent } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ApiError } from '../api/errors'
import { persistSession, startLogin, storeChallenge } from '../auth/session'
import { useToast } from '../hooks/useToast'
import { ROUTES, isAddingAccount, withAddAccount } from '../router/paths'
import { cn } from '../utils/cn'

type RedirectState = { from?: string } | null

export function LoginScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [fhNumber, setFhNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const addingAccount = isAddingAccount(location.search)
  const from = (location.state as RedirectState)?.from

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    const trimmed = fhNumber.trim().toUpperCase()
    if (trimmed.length === 0 || password.length === 0) {
      setError(t('auth.errors.emptyFields'))
      return
    }

    setBusy(true)
    try {
      const result = await startLogin(trimmed, password)

      if (result.kind === 'totp_required') {
        storeChallenge({ fhNumber: trimmed, challengeToken: result.challengeToken })
        // Carries `add` with it: a second account behind 2FA must not be dropped
        // on the conversation list half way through its own sign-in.
        void navigate(withAddAccount(ROUTES.twoFactor, location.search))
        return
      }

      await persistSession(trimmed, result)
      void navigate(ROUTES.connect, { replace: true, state: { from } })
    } catch (cause) {
      const message = describeLoginError(cause, t)
      setError(message)
      toast.notify({ kind: 'error', message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-bg px-5 py-10 text-fg">
      <form
        onSubmit={(event) => {
          void handleSubmit(event)
        }}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-bg-elevated p-6"
      >
        <h1 className="text-lg font-semibold">{t('auth.loginTitle')}</h1>
        {addingAccount ? (
          <p className="text-xs text-fg-muted">{t('auth.addAccountHint')}</p>
        ) : null}

        <Input
          label={t('auth.fhNumber')}
          value={fhNumber}
          onChange={(event) => {
            setFhNumber(event.target.value)
          }}
          placeholder="FH1234567"
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          required
        />

        <Input
          type="password"
          label={t('auth.password')}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
          }}
          autoComplete="current-password"
          required
        />

        {error === null ? null : (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}

        <Button type="submit" loading={busy} className="w-full">
          {t('auth.submitLogin')}
        </Button>

        <div className="flex flex-col gap-2 text-center text-xs text-fg-muted">
          <Link
            to={withAddAccount(ROUTES.register, location.search)}
            className={cn('font-medium text-accent hover:underline')}
          >
            {t('auth.toRegister')}
          </Link>
          <Link to={ROUTES.landing} className="hover:text-fg">
            {t('common.back')}
          </Link>
        </div>
      </form>
    </div>
  )
}

/**
 * The server answers 401 for a wrong password, an unknown FH number and an
 * unknown device alike, so the message has to cover all three; 429 comes with a
 * `Retry-After` the API client already waited out.
 */
function describeLoginError(cause: unknown, t: TFunction): string {
  if (cause instanceof ApiError) {
    if (cause.status === 401) {
      return t('auth.errors.invalidCredentials')
    }
    if (cause.status === 429) {
      return t('auth.errors.rateLimited')
    }
    if (cause.isTransportFailure) {
      return t('auth.errors.network')
    }
  }
  return cause instanceof Error ? cause.message : String(cause)
}
