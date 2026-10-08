import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  loginWithTotp,
  register as registerRequest,
  type LoginResult,
  type SessionResult,
} from '../api/auth'
import { registerThisDevice, revokeRegisteredDevice, uploadInitialPrekeys } from '../crypto/account'
import { persistSnapshot, restoreSnapshot } from '../crypto/snapshot'
import { destroyAccountStore, getAccountStore } from '../state/accountRegistry'
import { usePendingVoiceStore } from '../state/pendingVoiceStore'
import { DEVICE_LABEL, connectedAccountId, disconnectConnection } from '../state/connection'
import { useUiStore } from '../state/uiStore'
import { listAccounts, purgeAccount, saveAccount } from '../storage/accounts'
import { getSetting, setSetting } from '../storage/settings'
import type { Account } from '../types'
import { unsubscribeFromPush } from '../pwa/push'
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
  // The sign-in is being abandoned, so the password it was keeping goes with it.
  passwordInFlight = null
  sessionStorage.removeItem(TOTP_CHALLENGE_KEY)
}

/** Phase one of login: a session, or the challenge the 2FA screen needs. */
export async function startLogin(fhNumber: string, password: string): Promise<LoginResult> {
  passwordInFlight = { fhNumber, password, code: null }
  try {
    return await loginRequest(fhNumber, password, await rememberedDeviceNumber(fhNumber))
  } catch (error) {
    passwordInFlight = null
    throw error
  }
}

/** Phase two: the code, exchanged for a session. */
export async function startLoginWithTotp(
  challengeToken: string,
  code: string,
  fhNumber: string,
): Promise<SessionResult> {
  const result = await loginWithTotp(challengeToken, code, await rememberedDeviceNumber(fhNumber))

  // Kept alongside the password: a browser with no keys signs in a second time,
  // as the device it has just registered, and needs the same code again.
  if (passwordInFlight !== null && passwordInFlight.fhNumber === fhNumber) {
    passwordInFlight = { ...passwordInFlight, code }
  }
  return result
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
  passwordInFlight = { fhNumber: registered.fhNumber, password, code: null }

  const result = await loginRequest(registered.fhNumber, password, 1)
  return { fhNumber: registered.fhNumber, result }
}

/**
 * The password of a sign-in still in progress.
 *
 * Held for the one step that needs it and cleared the moment the account is
 * stored. A session is bound to the device number it was created with and the
 * server gives every registration a *new* number, so a browser with no stored
 * keys has to log in twice — once to be allowed to register a device, and once
 * as the device it has just become. The screen that holds the password is not
 * the one that finishes the flow: 2FA sits between them.
 *
 * In memory only, for the length of one sign-in, and never written anywhere.
 */
let passwordInFlight: { fhNumber: string; password: string; code: string | null } | null = null

/** Turns a session into the account the rest of the app uses. */
export async function persistSession(fhNumber: string, session: SessionResult): Promise<Account> {
  const pending = passwordInFlight
  passwordInFlight = null

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

  const aligned = await alignDevice(account, fhNumber, pending)

  await saveAccount(aligned)
  getAccountStore(aligned)
  await setSetting(deviceNumberSettingKey(fhNumber), String(aligned.deviceNumber))
  useUiStore.getState().setActiveAccount(aligned.id)

  return aligned
}

/**
 * Makes the session belong to the device this browser actually is.
 *
 * A session carries the device number it was created with, and the server hands
 * every registration a *new* number. A browser with no stored keys — after
 * signing out, which is meant to destroy them, or the first time it is used for
 * the account — therefore registers a device its own session cannot speak for:
 * the prekey upload is refused with 403, the device is left on the server with
 * no prekeys, and everybody who writes to this account is told the pool is
 * empty. One sign-in, an entire account unreachable, with the chat history still
 * sitting there saying otherwise.
 *
 * The cure is a second login, as the device it has just become.
 */
async function alignDevice(
  account: Account,
  fhNumber: string,
  pending: { password: string; code: string | null } | null,
): Promise<Account> {
  // The ordinary case: this browser has used the device before, and the login
  // already named it.
  if (await restoreSnapshot(account.id)) {
    return account
  }

  const device = await registerThisDevice(account, DEVICE_LABEL)

  let aligned = account
  try {
    if (device.deviceNumber !== account.deviceNumber) {
      if (pending === null) {
        throw new Error(
          '[auth] this browser has no keys for the account, and the device it registered cannot be signed in as without the password',
        )
      }

      const renewed = await logInAs(fhNumber, pending, device.deviceNumber)
      aligned = {
        ...account,
        deviceNumber: device.deviceNumber,
        sessionToken: renewed.sessionToken,
        expiresAt: renewed.expiresAt,
      }
    }

    // The state has to be written before anything else claims success: a device
    // this browser cannot remember is a device nobody can use, and leaving one
    // behind is the whole failure this function exists to prevent.
    await persistSnapshot(account.id)
  } catch (error) {
    // Nothing unusable may be left behind; see `revokeRegisteredDevice`.
    if (device.created) {
      await revokeRegisteredDevice(account, device.deviceNumber)
    }
    throw error
  }

  // The pool is deliberately not part of that: the device is registered, bound
  // and remembered, and `ensurePrekeysUploaded` fills the pool on the connection
  // that follows — it runs on every connect and every fifteen minutes after. A
  // pool that could not be uploaded here would otherwise cost the whole sign-in.
  await uploadInitialPrekeys(aligned, device.deviceNumber).catch((error: unknown) => {
    console.warn('[auth] the first prekey pool could not be uploaded yet', error)
  })

  return aligned
}

/**
 * A second sign-in, for the device number the server just assigned.
 *
 * The 2FA code is sent again rather than asked for again: it is seconds old and
 * still inside its window. A backup code is single-use, so that route can fail
 * here — it fails *safely*, revoking the device it could not adopt, and the
 * account is left exactly as it was.
 */
async function logInAs(
  fhNumber: string,
  pending: { password: string; code: string | null },
  deviceNumber: number,
): Promise<SessionResult> {
  const result = await loginRequest(fhNumber, pending.password, deviceNumber)
  if (result.kind === 'session') {
    return result
  }

  if (pending.code === null) {
    throw new Error('[auth] the server asked for a 2FA code, and none was kept')
  }
  return loginWithTotp(result.challengeToken, pending.code, deviceNumber)
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
  // Before the session goes: the endpoint needs the token, and a device that has
  // signed out should stop being woken.
  await unsubscribeFromPush(account)

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
  // Recordings still on their way belong to the session that is ending, and the
  // object URLs they hold would otherwise outlive the account by a tab's life.
  usePendingVoiceStore.getState().clear()

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
