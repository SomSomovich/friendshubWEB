import QRCode from 'qrcode'
import { Copy, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../api/auth'
import { ApiError } from '../api/errors'
import { disableTotp, enrollTotp, verifyTotpEnrollment } from '../api/twofa'
import { BackupCodes } from '../components/settings/BackupCodes'
import { ScreenHeader } from '../components/layout/ScreenHeader'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { useActiveAccount } from '../hooks/useActiveAccount'
import type { Account } from '../types'
import { useToast } from '../hooks/useToast'
import { settingsPath } from '../router/paths'
import { requireAccountStore } from '../state/accountRegistry'

type Enrollment = {
  secretBase32: string
  otpauthUri: string
}

/**
 * Turning two-factor authentication on or off.
 *
 * Reached from the security section rather than sitting in it: the flow has four
 * steps and a one-time reveal, and burying that inside a list of settings would
 * make a page nobody can finish on a phone.
 */
export function TwoFactorSetupScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const activeAccount = useActiveAccount()

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(activeAccount?.totpEnabled ?? false)

  if (activeAccount === null) {
    return null
  }
  const account: Account = activeAccount

  async function startEnrollment(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      setEnrollment(await enrollTotp(account))
    } catch (cause) {
      reportFailure(cause, t, setError, toast)
    } finally {
      setBusy(false)
    }
  }

  async function submitEnrollment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await verifyTotpEnrollment(account, code.trim())
      setBackupCodes(result.backupCodes)
      setEnrollment(null)
      await refresh()
      setEnabled(true)
      toast.notify({ kind: 'success', message: t('twoFactorSetup.enabled') })
    } catch (cause) {
      reportFailure(cause, t, setError, toast)
    } finally {
      setBusy(false)
    }
  }

  async function submitDisable(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await disableTotp(account, { password, code: code.trim() })
      setPassword('')
      setCode('')
      await refresh()
      setEnabled(false)
      toast.notify({ kind: 'success', message: t('twoFactorSetup.disabled') })
    } catch (cause) {
      reportFailure(cause, t, setError, toast)
    } finally {
      setBusy(false)
    }
  }

  /** Re-reads `/me`, because the flag lives on the account record the app shows. */
  async function refresh(): Promise<void> {
    const me = await getMe(account)
    await requireAccountStore(account.id).getState().actions.updateAccount({ totpEnabled: me.totpEnabled })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg text-fg">
      <ScreenHeader
        title={t('twoFactorSetup.title')}
        onBack={() => {
          void navigate(settingsPath('security'))
        }}
        backMode="always"
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          {backupCodes !== null ? (
            <BackupCodes codes={backupCodes} />
          ) : enabled ? (
            <form
              onSubmit={(event) => {
                void submitDisable(event)
              }}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-bg-elevated p-5"
            >
              <p className="text-sm text-fg">{t('twoFactorSetup.enabledHint')}</p>
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
              <Input
                label={t('auth.code')}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value)
                }}
                inputMode="numeric"
                maxLength={6}
                required
              />
              {error === null ? null : <p className="text-xs text-danger">{error}</p>}
              <Button type="submit" variant="danger" loading={busy}>
                {t('twoFactorSetup.disable')}
              </Button>
            </form>
          ) : enrollment === null ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-bg-elevated p-5">
              <EmptyState
                icon={ShieldCheck}
                title={t('twoFactorSetup.offTitle')}
                description={t('twoFactorSetup.offHint')}
              />
              <Button
                onClick={() => {
                  void startEnrollment()
                }}
                loading={busy}
                className="w-full"
              >
                {t('twoFactorSetup.start')}
              </Button>
              {error === null ? null : <p className="text-xs text-danger">{error}</p>}
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                void submitEnrollment(event)
              }}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-bg-elevated p-5"
            >
              <p className="text-sm text-fg">{t('twoFactorSetup.addHint')}</p>

              <EnrollmentQr uri={enrollment.otpauthUri} />

              <div className="flex flex-col gap-1">
                <span className="text-xs text-fg-muted">{t('twoFactorSetup.secret')}</span>
                <code className="rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs break-all text-fg">
                  {enrollment.secretBase32}
                </code>
              </div>

              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(enrollment.otpauthUri)
                    .then(() => {
                      toast.notify({ kind: 'success', message: t('twoFactorSetup.copied') })
                    })
                    .catch((cause: unknown) => {
                      console.error('[settings] could not copy the otpauth URI', cause)
                    })
                }}
                className="flex w-fit cursor-pointer items-center gap-1.5 text-xs font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Copy className="size-3.5" aria-hidden />
                {t('twoFactorSetup.copyUri')}
              </button>

              <Input
                label={t('auth.code')}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value)
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                helper={t('twoFactorSetup.confirmHint')}
                required
              />

              {error === null ? null : <p className="text-xs text-danger">{error}</p>}
              <Button type="submit" loading={busy}>
                {t('twoFactorSetup.confirm')}
              </Button>
            </form>
          )}

          <p className="text-center text-xs text-fg-muted">{t('twoFactorSetup.backupReminder')}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * The `otpauth://` URI as a scannable code.
 *
 * Drawn black on white whatever the theme is: the app's dark palette inverts the
 * contrast a scanner expects, and a fair share of them refuse an inverted code
 * outright.
 */
function EnrollmentQr({ uri }: { uri: string }) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) {
      return
    }
    void QRCode.toCanvas(canvas, uri, {
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    }).catch((cause: unknown) => {
      // The secret below the code is the manual path, so a canvas that refuses
      // to draw costs convenience, not access.
      console.error('[2fa] the QR code could not be drawn', cause)
    })
  }, [uri])

  return (
    <div className="flex flex-col items-center gap-1.5">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t('twoFactorSetup.qrLabel')}
        className="rounded-lg border border-border bg-white p-1"
      />
      <span className="text-xs text-fg-muted">{t('twoFactorSetup.qrHint')}</span>
    </div>
  )
}

function reportFailure(
  cause: unknown,
  t: TFunction,
  setError: (message: string) => void,
  toast: { notify: (input: { kind: 'error'; message: string }) => string },
): void {
  const message =
    cause instanceof ApiError && cause.isTransportFailure
      ? t('auth.errors.network')
      : cause instanceof ApiError && cause.status === 401
        ? t('auth.errors.badCode')
        : cause instanceof Error
          ? cause.message
          : String(cause)
  setError(message)
  toast.notify({ kind: 'error', message })
}
