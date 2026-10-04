/**
 * Seeds a signed-in session for screenshots and DOM checks.
 *
 * It logs in for real with the throwaway account in `scripts/.smoke-account.json`
 * (the credentials arrive in the URL hash from `dev-tests/run.mjs`) and stores
 * the account through the application's own storage layer, so the app under test
 * later sees exactly what a normal login would have written. The theme and
 * language are written where the app's pre-paint bootstrap reads them, which is
 * why they survive into the second page load this harness then screenshots.
 */
import { getMe, login } from '../src/api/auth'
import { API_BASE_URL } from '../src/api/client'
import { applyDocumentLanguage, isLanguage, persistLanguage } from '../src/i18n/language'
import { saveAccount } from '../src/storage/accounts'
import { applyTheme, isTheme, persistTheme } from '../src/theme/theme'

const params = new URLSearchParams(location.hash.replace(/^#/, ''))

async function report(payload: Record<string, unknown>): Promise<void> {
  // Also into the page, so a `--dump-dom` run shows why seeding failed instead of
  // leaving the harness waiting for a message that is never sent.
  const output = document.getElementById('out')
  if (output !== null) {
    output.textContent = JSON.stringify(payload, null, 2)
  }

  const resultUrl = params.get('result')
  if (resultUrl === null) {
    return
  }
  await fetch(resultUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload),
  })
}

async function main(): Promise<void> {
  const fhNumber = params.get('fh')
  const password = params.get('password')
  const deviceNumber = Number.parseInt(params.get('device') ?? '1', 10)
  const theme = params.get('theme')
  const language = params.get('lang')

  if (isTheme(theme)) {
    applyTheme(theme)
    persistTheme(theme)
  }
  if (isLanguage(language)) {
    applyDocumentLanguage(language)
    persistLanguage(language)
  }

  if (fhNumber === null || password === null) {
    await report({ ok: false, error: 'the URL carries no credentials' })
    return
  }

  const session = await login(fhNumber, password, deviceNumber)
  if (session.kind !== 'session') {
    await report({ ok: false, error: 'login asked for a TOTP code' })
    return
  }

  const me = await getMe({ sessionToken: session.sessionToken, deviceNumber })
  await saveAccount({
    id: me.id,
    userId: me.userId,
    fhNumber: me.fhNumber,
    username: me.username,
    avatarUrl: me.avatarUrl,
    totpEnabled: me.totpEnabled,
    deviceNumber,
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt,
  })

  await report({ ok: true, accountId: me.id, username: me.username, fhNumber: me.fhNumber })

  // One Edge launch per capture: the browser navigates on to the app itself, so
  // the harness never has to start a second instance in the same profile (which
  // would silently forward the URL to this one and exit with no output).
  const next = params.get('next')
  if (next !== null) {
    location.replace(next)
  }
}

/**
 * Enough of an error to diagnose it from a DOM dump: the class, the message and
 * whatever it carries as a cause. A bare `String(error)` hides all three — an
 * error that stringifies to something unhelpful is worse than no report.
 */
function describeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      cause: error.cause === undefined ? null : describeError(error.cause),
    }
  }
  return { name: typeof error, message: JSON.stringify(error) }
}

void main().catch((error: unknown) => {
  void report({ ok: false, base: API_BASE_URL, error: describeError(error) })
})
