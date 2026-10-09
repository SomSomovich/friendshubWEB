import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/errors'
import { clearChallenge, persistSession, readChallenge, startLoginWithTotp } from '../auth/session'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../hooks/useToast'
import { ROUTES, withAddAccount, type AuthRedirectState } from '../router/paths'

/** TOTP is six digits; a backup code is ten characters. */
const TOTP_LENGTH = 6
const BACKUP_CODE_PATTERN = /^[A-Za-z0-9-]{6,14}$/

export function TwoFactorScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  /** Where the visitor was headed before the sign-in flow caught them. */
  const from = (location.state as AuthRedirectState)?.from

  const [challenge] = useState(readChallenge)
  const [code, setCode] = useState('')
  const [backupMode, setBackupMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Arriving here without a challenge means the tab was reloaded after the
  // challenge expired, or the route was opened directly.
  useEffect(() => {
    if (challenge === null) {
      // Back to sign-in with `add` intact, so a half-finished second account
      // does not end up on the conversation list of the first one.
      void navigate(withAddAccount(ROUTES.login, location.search), { replace: true, state: { from } })
      return
    }
    inputRef.current?.focus()
  }, [challenge, navigate, location.search, from])

  if (challenge === null) {
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    const trimmed = code.trim()
    const valid = backupMode ? BACKUP_CODE_PATTERN.test(trimmed) : /^\d{6}$/.test(trimmed)
    if (!valid) {
      setError(backupMode ? t('auth.errors.badBackupCode') : t('auth.errors.badTotpCode'))
      return
    }

    setBusy(true)
    try {
      const session = await startLoginWithTotp(
        challenge?.challengeToken ?? '',
        trimmed,
        challenge?.fhNumber ?? '',
      )
      await persistSession(challenge?.fhNumber ?? '', session)
      clearChallenge()
      void navigate(ROUTES.connect, { replace: true, state: { from } })
    } catch (cause) {
      const message =
        cause instanceof ApiError && cause.status === 401
          ? t('auth.errors.badCode')
          : cause instanceof ApiError && cause.isTransportFailure
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
        <h1 className="text-lg font-semibold">{t('auth.twoFactorTitle')}</h1>
        <p className="text-xs text-fg-muted">
          {backupMode ? t('auth.twoFactorBackupHint') : t('auth.twoFactorHint')}
        </p>

        <Input
          ref={inputRef}
          label={backupMode ? t('auth.backupCode') : t('auth.code')}
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
          }}
          inputMode={backupMode ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          maxLength={backupMode ? 14 : TOTP_LENGTH}
          placeholder={backupMode ? 'ABCD2345EF' : '123456'}
          // Digits are easier to read apart, and it is how authenticator apps show it.
          className={backupMode ? undefined : 'text-center text-lg tracking-[0.4em] tabular-nums'}
          required
        />

        {error === null ? null : (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}

        <Button type="submit" loading={busy} className="w-full">
          {t('auth.submitCode')}
        </Button>

        <div className="flex flex-col gap-2 text-center text-xs text-fg-muted">
          <button
            type="button"
            onClick={() => {
              setBackupMode((value) => !value)
              setCode('')
              setError(null)
            }}
            className="cursor-pointer font-medium text-accent hover:underline"
          >
            {backupMode ? t('auth.useTotp') : t('auth.useBackupCode')}
          </button>
          <Link
            to={withAddAccount(ROUTES.login, location.search)}
            state={{ from }}
            onClick={() => {
              clearChallenge()
            }}
            className="hover:text-fg"
          >
            {t('auth.toLogin')}
          </Link>
        </div>
      </form>
    </div>
  )
}
