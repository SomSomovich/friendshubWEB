import type { Account } from '../types'
import { get, post } from './client'

export type AccountAuth = Pick<Account, 'sessionToken' | 'deviceNumber'>

export type RegisterResult = {
  id: string
  userId: number
  fhNumber: string
  username: string
}

export type SessionResult = {
  kind: 'session'
  sessionToken: string
  expiresAt: number
}

export type TotpRequiredResult = {
  kind: 'totp_required'
  challengeToken: string
  expiresInSeconds: number
}

export type LoginResult = SessionResult | TotpRequiredResult

export type MeResponse = {
  id: string
  userId: number
  fhNumber: string
  username: string
  avatarUrl: string | null
  totpEnabled: boolean
  customStatusText: string | null
  customStatusEmoji: string | null
  customStatusExpiresAt: number | null
}

/** Passwords are 8..128 characters; anything else is rejected as `bad_request`. */
export function register(password: string): Promise<RegisterResult> {
  return post<RegisterResult>('/register', { password })
}

/**
 * Phase one of login. `deviceNumber` must be an existing device, except for `1`
 * on an account that has none yet — the bootstrap case where the first device is
 * registered after logging in.
 */
export function login(
  fhNumber: string,
  password: string,
  deviceNumber: number,
): Promise<LoginResult> {
  return post<LoginResult>('/login', {
    fh_number: fhNumber,
    password,
    device_number: deviceNumber,
  })
}

/** Phase two: a TOTP code or a backup code, consuming the challenge. */
export function loginWithTotp(
  challengeToken: string,
  code: string,
  deviceNumber: number,
): Promise<SessionResult> {
  return post<SessionResult>('/login/2fa', {
    challenge_token: challengeToken,
    code,
    device_number: deviceNumber,
  })
}

export function logout(account: AccountAuth): Promise<void> {
  return post<void>('/logout', undefined, { account })
}

export function getMe(account: AccountAuth): Promise<MeResponse> {
  return get<MeResponse>('/me', { account })
}
