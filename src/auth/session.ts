import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  loginWithTotp,
  register as registerRequest,
  type LoginResult,
  type SessionResult,
} from '../api/auth'
import { destroyAccountStore, getAccountStore } from '../state/accountRegistry'
import { connectedAccountId, disconnectConnection } from '../state/connection'
import { useUiStore } from '../state/uiStore'
import { listAccounts, purgeAccount, saveAccount } from '../storage/accounts'
import { getSetting, setSetting } from '../storage/settings'
import type { Account } from '../types'
import { reset as resetCryptoState } from '../wasm'

/**
 * Signing in, and everything that has to happen before the app is usable: the
 * account row, the crypto state, and the socket.
 *
 * Lives outside the screens so the flow can be reasoned about in one place — and
 * so 4.6 can reuse it when it adds another account. The socket itself belongs to
 * `src/state/connection.ts`, which owns it for the whole session rather than for
 * as long as one screen happens to be mounted.
 */

/**
 * The 2FA challenge while the visitor is on the code screen.
 *
 * `sessionStorage`, not `localStorage`: a challenge is a short-lived credential,
 * and it should not outlive the tab.
 */
export const TOTP_CHALLENGE_KEY = 'fh.totpChallenge'

export type PendingChallenge = {
  fhNumber: string
  challengeToken: string
}

function deviceNumberSettingKey(fhNumber: string): string {
  return `device_number:${fhNumber}`
}

/**
 * The device number this browser uses for an account.
 *
 * A login is bound to a device that has to exist — 1 is the bootstrap case for an
 * account without devices — so the number cannot simply be random: it is
 * remembered per FH number and defaults to 1.
 */
export async function rememberedDeviceNumber(fhNumber: string): Promise<number> {
  const stored = await getSetting(deviceNumberSettingKey(fhNumber))
  const parsed = stored === null ? Number.NaN : Number.parseInt(stored, 10)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
}

export function storeChallenge(challenge: PendingChallenge): void {
  sessionStorage.setItem(TOTP_CHALLENGE_KEY, JSON.stringify(challenge))
}

export function readChallenge(): PendingChallenge | null {
  const raw = sessionStorage.getItem(TOTP_CHALLENGE_KEY)
  if (raw === null) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as PendingChallenge).fhNumber === 'string' &&
      typeof (parsed as PendingChallenge).challengeToken === 'string'
    ) {
      return parsed as PendingChallenge
    }
  } catch (error) {
    console.warn('[auth] the stored 2FA challenge is unreadable', error)
  }
  return null
}

export function clearChallenge(): void {
  sessionStorage.removeItem(TOTP_CHALLENGE_KEY)
}

/** Phase one of login: a session, or the challenge the 2FA screen needs. */
export async function startLogin(fhNumber: string, password: string): Promise<LoginResult> {
  return loginRequest(fhNumber, password, await rememberedDeviceNumber(fhNumber))
}

/** Phase two: the code, exchanged for a session. */
export async function startLoginWithTotp(
  challengeToken: string,
  code: string,
  fhNumber: string,
): Promise<SessionResult> {
  return loginWithTotp(challengeToken, code, await rememberedDeviceNumber(fhNumber))
}

export type RegistrationLogin = {
  fhNumber: string
  result: LoginResult
}

/**
 * Creates an account and signs it in.
 *
 * The first login uses device number 1: the account has no devices yet, and the
 * server treats 1 as the bootstrap case that the registration in
 * `initializeAccount` then fills in.
 */
export async function registerAndStartLogin(password: string): Promise<RegistrationLogin> {
  const registered = await registerRequest(password)
  const result = await loginRequest(registered.fhNumber, password, 1)
  return { fhNumber: registered.fhNumber, result }
}

/** Turns a session into the account the rest of the app uses. */
export async function persistSession(fhNumber: string, session: SessionResult): Promise<Account> {
  const deviceNumber = await rememberedDeviceNumber(fhNumber)
  const me = await getMe({ sessionToken: session.sessionToken, deviceNumber })

  const account: Account = {
    id: me.id,
    userId: me.userId,
    fhNumber: me.fhNumber,
    username: me.username,
    avatarUrl: me.avatarUrl,
    totpEnabled: me.totpEnabled,
    deviceNumber,
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt,
  }

  await saveAccount(account)
  getAccountStore(account)
  await setSetting(deviceNumberSettingKey(fhNumber), String(deviceNumber))
  useUiStore.getState().setActiveAccount(account.id)

  return account
}

/**
 * Makes the account usable: its crypto state, then its connection.
 *
 * The state is restored from IndexedDB when this browser has used the device
 * before, and created (identity, device registration, prekey pool) when it has
 * not — the slow path, which is why the caller shows progress. A socket that
 * cannot be reached is not a failed sign-in: the app works offline, and the
 * connection is retried in the background.
 */
export { ensureConnected as connectAccount } from '../state/connection'
export type { ConnectStep } from '../state/connection'

/**
 * Signs an account out of this browser and forgets it.
 *
 * The order matters: the session is revoked while the token is still readable,
 * and only then is the local copy destroyed. A revocation that fails — a dead
 * network, an already-expired session — must not leave the account behind, which
 * is why the failure is only logged.
 */
export async function signOutAccount(account: Account): Promise<void> {
  try {
    await logoutRequest({ sessionToken: account.sessionToken, deviceNumber: account.deviceNumber })
  } catch (error) {
    console.warn('[auth] the session could not be revoked on the server', error)
  }

  await forgetAccount(account)
}

/**
 * Drops every local trace of an account, without telling the server.
 *
 * Separate from `signOutAccount` because revoking every session already ends the
 * server-side session, and the follow-up `POST /logout` would only earn a 401.
 */
export async function forgetAccount(account: Account): Promise<void> {
  if (connectedAccountId() === account.id) {
    await disconnectConnection()
  }

  destroyAccountStore(account.id)
  await purgeAccount(account.id)

  try {
    await resetCryptoState(account.id)
  } catch (error) {
    // The state is gone from storage either way; a module that refuses to forget
    // it is a bug, but not one worth blocking the sign-out over.
    console.warn('[auth] the crypto state could not be cleared', error)
  }

  if (useUiStore.getState().activeAccountId === account.id) {
    const remaining = await listAccounts()
    useUiStore.getState().setActiveAccount(remaining.at(0)?.id ?? null)
  }
}
