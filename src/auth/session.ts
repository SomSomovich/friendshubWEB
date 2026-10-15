import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  loginWithTotp,
  register as registerRequest,
  type LoginResult,
  type TotpRequiredResult,
  type SessionResult,
} from '../api/auth'
import { registerThisDevice, revokeRegisteredDevice, uploadInitialPrekeys, type DeviceRegistration } from '../crypto/account'
import { persistSnapshot, restoreSnapshot } from '../crypto/snapshot'
import { destroyAccountStore, getAccountStore } from '../state/accountRegistry'
import { usePendingVoiceStore } from '../state/pendingVoiceStore'
import { DEVICE_LABEL, connectedAccountId, disconnectConnection } from '../state/connection'
import { useUiStore } from '../state/uiStore'
import { listAccounts, purgeAccount, saveAccount } from '../storage/accounts'
import { getSetting, setSetting } from '../storage/settings'
import { deleteSnapshot } from '../storage/crypto_state'
import { ApiError } from '../api/errors'
import type { Account } from '../types'
import { unsubscribeFromPush } from '../pwa/push'
import { reset as resetCryptoState } from '../wasm'

/** Login, device setup, local persistence and account activation. */

/** Short-lived challenges belong to the tab and include their routing binding. */
export const TOTP_CHALLENGE_KEY = 'fh.totpChallenge'

export type PendingChallenge = {
  fhNumber: string
  challengeToken: string
  deviceNumber: number
  expiresAt: number
  deviceSetup?: boolean
}

/** Client metadata: the server does not include its session binding in JSON. */
export type BoundSession = SessionResult & { deviceNumber: number }
export type BoundLoginResult = LoginResult & { deviceNumber: number }
export type PersistSessionResult = Account | TotpRequiredResult

const PENDING_DEVICE_KEY = 'fh.pendingDevice'
type PendingDevice = { account: Account; device: DeviceRegistration; previousDeviceNumber: number }
let passwordInFlight: { fhNumber: string; password: string } | null = null
let totpInFlight: { token: string; work: Promise<BoundSession> } | null = null
let persistenceInFlight: { token: string; work: Promise<PersistSessionResult> } | null = null

function deviceNumberSettingKey(fhNumber: string): string {
  return `device_number:${fhNumber}`
}

function validDeviceNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1
}

/** The fallback is only for starting a new login, never for an existing challenge. */
export async function rememberedDeviceNumber(fhNumber: string): Promise<number> {
  const stored = await getSetting(deviceNumberSettingKey(fhNumber))
  const parsed = stored === null ? Number.NaN : Number(stored)
  return validDeviceNumber(parsed) ? parsed : 1
}

export function storeChallenge(challenge: PendingChallenge): void {
  sessionStorage.setItem(TOTP_CHALLENGE_KEY, JSON.stringify(challenge))
}

export function readChallenge(): PendingChallenge | null {
  const raw = sessionStorage.getItem(TOTP_CHALLENGE_KEY)
  if (raw === null) return null
  try {
    const parsed: PendingChallenge = JSON.parse(raw)
    if (
      parsed !== null &&
      typeof parsed.fhNumber === 'string' && parsed.fhNumber.length > 0 &&
      typeof parsed.challengeToken === 'string' && parsed.challengeToken.length > 0 &&
      validDeviceNumber(parsed.deviceNumber) &&
      Number.isFinite(parsed.expiresAt) && parsed.expiresAt > Date.now()
    ) {
      return parsed
    }
  } catch (error) {
    console.warn('[auth] the stored 2FA challenge is unreadable', error)
  }
  // Old challenges without a binding cannot safely be resumed.
  return null
}

export function clearChallenge(): void {
  passwordInFlight = null
  sessionStorage.removeItem(TOTP_CHALLENGE_KEY)
}

function rememberChallenge(
  fhNumber: string,
  result: TotpRequiredResult,
  deviceNumber: number,
  deviceSetup = false,
): void {
  storeChallenge({
    fhNumber,
    challengeToken: result.challengeToken,
    deviceNumber,
    expiresAt: Date.now() + result.expiresInSeconds * 1000,
    deviceSetup,
  })
}

function readPendingDevice(): PendingDevice | null {
  const raw = sessionStorage.getItem(PENDING_DEVICE_KEY)
  if (raw === null) return null
  const parsed: PendingDevice = JSON.parse(raw)
  if (
    parsed === null || typeof parsed.account?.id !== 'string' ||
    typeof parsed.account.sessionToken !== 'string' ||
    typeof parsed.account.fhNumber !== 'string' ||
    !validDeviceNumber(parsed.account.deviceNumber) ||
    !validDeviceNumber(parsed.device?.deviceNumber) ||
    typeof parsed.device.created !== 'boolean' ||
    !validDeviceNumber(parsed.previousDeviceNumber)
  ) {
    throw new Error('[auth] invalid pending device registration')
  }
  return parsed
}

/** Abandoning setup only deletes keys after the server confirms revocation. */
export async function cancelLogin(): Promise<void> {
  clearChallenge()
  const pending = readPendingDevice()
  if (pending === null) return
  if (!pending.device.created || !(await revokeRegisteredDevice(pending.account, pending.device.deviceNumber))) {
    // Keep the snapshot and binding recoverable by the next login if cleanup
    // is forbidden or offline. Never destroy keys for an active device.
    return
  }
  await deleteSnapshot(pending.account.id)
  await resetCryptoState(pending.account.id)
  await setSetting(deviceNumberSettingKey(pending.account.fhNumber), String(pending.previousDeviceNumber))
  sessionStorage.removeItem(PENDING_DEVICE_KEY)
}

/** Resolve the routing number once and carry it through both authentication phases. */
export async function startLogin(fhNumber: string, password: string): Promise<BoundLoginResult> {
  await cancelLogin()
  const deviceNumber = await rememberedDeviceNumber(fhNumber)
  passwordInFlight = { fhNumber, password }
  try {
    const result = await loginRequest(fhNumber, password, deviceNumber)
    if (result.kind === 'totp_required') rememberChallenge(fhNumber, result, deviceNumber)
    return { ...result, deviceNumber }
  } catch (error) {
    passwordInFlight = null
    throw error
  }
}

/** A consumed challenge is removed before device setup or any other fallible work. */
export function startLoginWithTotp(
  challengeToken: string,
  code: string,
  fhNumber: string,
): Promise<BoundSession> {
  if (totpInFlight?.token === challengeToken) return totpInFlight.work
  const challenge = readChallenge()
  if (challenge === null || challenge.challengeToken !== challengeToken || challenge.fhNumber !== fhNumber) {
    return Promise.reject(new Error('[auth] this 2FA challenge is no longer active; sign in again'))
  }
  const work = loginWithTotp(challengeToken, code, challenge.deviceNumber).then((result) => {
    sessionStorage.removeItem(TOTP_CHALLENGE_KEY)
    return { ...result, deviceNumber: challenge.deviceNumber }
  }).catch(async (error: unknown) => {
    if (error instanceof ApiError && (error.status === 401 || error.isTransportFailure)) {
      // A 401 can mean a bad code OR a spent challenge. A lost response may
      // also have consumed it. Start a fresh challenge, but never resend a code.
      sessionStorage.removeItem(TOTP_CHALLENGE_KEY)
      const credentials = passwordInFlight
      if (credentials?.fhNumber === fhNumber) {
        try {
          const refreshed = await loginRequest(fhNumber, credentials.password, challenge.deviceNumber)
          if (refreshed.kind === 'session') return { ...refreshed, deviceNumber: challenge.deviceNumber }
          rememberChallenge(fhNumber, refreshed, challenge.deviceNumber, challenge.deviceSetup)
        } catch (refreshError) {
          passwordInFlight = null
          console.warn('[auth] a fresh 2FA challenge could not be obtained', refreshError)
        }
      }
    }
    throw error
  }).finally(() => {
    if (totpInFlight?.work === work) totpInFlight = null
  })
  totpInFlight = { token: challengeToken, work }
  return work
}

export type RegistrationLogin = { fhNumber: string; result: BoundLoginResult }

export async function registerAndStartLogin(password: string): Promise<RegistrationLogin> {
  await cancelLogin()
  const registered = await registerRequest(password)
  passwordInFlight = { fhNumber: registered.fhNumber, password }
  try {
    const result = await loginRequest(registered.fhNumber, password, 1)
    if (result.kind === 'totp_required') rememberChallenge(registered.fhNumber, result, 1)
    return { fhNumber: registered.fhNumber, result: { ...result, deviceNumber: 1 } }
  } catch (error) {
    passwordInFlight = null
    throw error
  }
}

/** Duplicate callers share the complete setup, including registration. */
export function persistSession(fhNumber: string, session: BoundSession): Promise<PersistSessionResult> {
  if (persistenceInFlight?.token === session.sessionToken) return persistenceInFlight.work
  const work = finishSession(fhNumber, session).finally(() => {
    if (persistenceInFlight?.work === work) persistenceInFlight = null
  })
  persistenceInFlight = { token: session.sessionToken, work }
  return work
}

async function finishSession(fhNumber: string, session: BoundSession): Promise<PersistSessionResult> {
  const credentials = passwordInFlight
  passwordInFlight = null
  const me = await getMe(session)
  let account: Account = {
    id: me.id,
    userId: me.userId,
    fhNumber: me.fhNumber,
    username: me.username,
    avatarUrl: me.avatarUrl,
    totpEnabled: me.totpEnabled,
    deviceNumber: session.deviceNumber,
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt,
  }
  let setup = readPendingDevice()
  if (setup !== null && setup.account.id !== account.id) {
    throw new Error('[auth] finish the pending device setup before adding another account')
  }

  const restored = await restoreSnapshot(account.id)
  if (!restored) {
    const device = await registerThisDevice(account, DEVICE_LABEL)
    setup = { account, device, previousDeviceNumber: account.deviceNumber }
    try {
      // Keep both identity and routing number recoverable across a reload while
      // the visitor enters a fresh second factor for an assigned device number.
      sessionStorage.setItem(PENDING_DEVICE_KEY, JSON.stringify(setup))
      await persistSnapshot(account.id)
      await setSetting(deviceNumberSettingKey(fhNumber), String(device.deviceNumber))
    } catch (error) {
      if (device.created) await revokeRegisteredDevice(account, device.deviceNumber)
      throw error
    }
  }

  if (setup !== null && setup.device.deviceNumber !== account.deviceNumber) {
    if (credentials === null || credentials.fhNumber !== fhNumber) {
      throw new Error('[auth] sign in again to finish registering this device')
    }
    const renewed = await loginRequest(fhNumber, credentials.password, setup.device.deviceNumber)
    if (renewed.kind === 'totp_required') {
      // TOTP steps and backup codes are single-use. Never replay the first code.
      passwordInFlight = credentials
      rememberChallenge(fhNumber, renewed, setup.device.deviceNumber, true)
      return renewed
    }
    account = {
      ...account,
      deviceNumber: setup.device.deviceNumber,
      sessionToken: renewed.sessionToken,
      expiresAt: renewed.expiresAt,
    }
  }

  if (setup !== null) {
    // Cleanup, if later needed, can now use the session of the new device itself.
    sessionStorage.setItem(PENDING_DEVICE_KEY, JSON.stringify({ ...setup, account }))
    try {
      await uploadInitialPrekeys(account, account.deviceNumber)
    } catch (error) {
      console.warn('[auth] the first prekey pool could not be uploaded yet', error)
    } finally {
      // Prekey generation mutates WASM state even when an upload fails.
      await persistSnapshot(account.id)
    }
  }

  await saveAccount(account)
  await setSetting(deviceNumberSettingKey(fhNumber), String(account.deviceNumber))
  sessionStorage.removeItem(PENDING_DEVICE_KEY)
  getAccountStore(account)
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
