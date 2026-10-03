import type { AccountAuth } from './auth'
import { post } from './client'

export type TotpEnrollment = {
  secretBase32: string
  otpauthUri: string
}

export type TotpVerification = {
  /** Shown exactly once, by design. */
  backupCodes: string[]
}

/** Fails with `conflict` when 2FA is already enabled. */
export function enrollTotp(account: AccountAuth): Promise<TotpEnrollment> {
  return post<TotpEnrollment>('/2fa/enroll', undefined, { account })
}

export function verifyTotpEnrollment(
  account: AccountAuth,
  code: string,
): Promise<TotpVerification> {
  return post<TotpVerification>('/2fa/enroll/verify', { code }, { account })
}

/** Requires the account password and a current code; rate limited per IP. */
export function disableTotp(
  account: AccountAuth,
  input: { password: string; code: string },
): Promise<void> {
  return post<void>('/2fa/disable', { password: input.password, code: input.code }, { account })
}
