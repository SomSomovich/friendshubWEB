import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/errors'
import { persistSession, registerAndStartLogin } from '../auth/session'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../hooks/useToast'
import { ROUTES, withAddAccount } from '../router/paths'

/** The API accepts 8..128 characters; the client refuses anything shorter first. */
const MIN_PASSWORD_LENGTH = 8

export function RegisterScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.errors.passwordTooShort', { count: MIN_PASSWORD_LENGTH }))
      return
    }

    setBusy(true)
    try {
      const { fhNumber, result } = await registerAndStartLogin(password)

      if (result.kind !== 'session') {
        // A brand-new account cannot have 2FA; if it says otherwise, the server
        // and this client disagree about something worth surfacing.
        throw new Error(t('auth.errors.unexpectedChallenge'))
      }

      await persistSession(fhNumber, result)
      toast.notify({
        kind: 'success',
        message: t('auth.registered', { fhNumber }),
      })
      void navigate(ROUTES.connect, { replace: true })
    } catch (cause) {
      const message =
        cause instanceof ApiError && cause.isTransportFailure
          ? t('auth.errors.network')
          : cause instanceof ApiError && cause.status === 429
            ? t('auth.errors.rateLimited')
            : cause instanceof Error
              ? cause.message
              : String(cause)
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
        <h1 className="text-lg font-semibold">{t('auth.registerTitle')}</h1>
        <p className="text-xs text-fg-muted">{t('auth.registerHint')}</p>

        <Input
          type="password"
          label={t('auth.password')}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
          }}
          helper={t('auth.passwordRules', { count: MIN_PASSWORD_LENGTH })}
          autoComplete="new-password"
          required
        />

        {error === null ? null : (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}

        <Button type="submit" loading={busy} className="w-full">
          {t('auth.submitRegister')}
        </Button>

        <div className="flex flex-col gap-2 text-center text-xs text-fg-muted">
          <Link
            to={withAddAccount(ROUTES.login, location.search)}
            className="font-medium text-accent hover:underline"
          >
            {t('auth.toLogin')}
          </Link>
          <Link to={ROUTES.landing} className="hover:text-fg">
            {t('common.back')}
          </Link>
        </div>
      </form>
    </div>
  )
}
