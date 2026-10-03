import type { AccountAuth } from './auth'
import { get, post } from './client'

/**
 * Deletion is deliberately a two-phase flow: initiating only schedules it, and
 * confirming opens a five-minute window that begins five minutes after the
 * request, so an accidental tap has time to be undone.
 */

export type DeletionInitiation = {
  confirmAfter: number
  confirmUntil: number
  confirmAfterSeconds: number
  confirmWindowSeconds: number
}

export type DeletionStatus = {
  pending: boolean
  accountId: string | null
  initiatedAt: number | null
  confirmAfter: number | null
  confirmUntil: number | null
}

export function initiateAccountDeletion(account: AccountAuth): Promise<DeletionInitiation> {
  return post<DeletionInitiation>('/account/delete/initiate', undefined, { account })
}

/** `code` is required when 2FA is enabled. */
export function confirmAccountDeletion(
  account: AccountAuth,
  input: { password: string; code: string | null },
): Promise<void> {
  return post<void>(
    '/account/delete/confirm',
    { password: input.password, code: input.code },
    { account },
  )
}

export function cancelAccountDeletion(account: AccountAuth): Promise<void> {
  return post<void>('/account/delete/cancel', undefined, { account })
}

export function getAccountDeletionStatus(account: AccountAuth): Promise<DeletionStatus> {
  return get<DeletionStatus>('/account/delete/status', { account })
}
