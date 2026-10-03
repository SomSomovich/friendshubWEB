import type { AccountAuth } from './auth'
import { del, get, post } from './client'

export type Contact = {
  targetAccountId: string
  /** The name this account chose for the contact; `null` if never set. */
  localUsername: string | null
  userId: number
  fhNumber: string
  username: string
  avatarUrl: string | null
}

export type BlockedAccount = {
  accountId: string
  fhNumber: string
  username: string
  avatarUrl: string | null
  blockedAt: number
}

export function listContacts(account: AccountAuth): Promise<Contact[]> {
  return get<Contact[]>('/contacts', { account })
}

/** Adds a contact or updates the local name; `localUsername` is 1..64 chars. */
export function addContact(
  account: AccountAuth,
  input: { targetFhNumber: string; localUsername: string },
): Promise<Contact> {
  return post<Contact>(
    '/contacts',
    { target_fh_number: input.targetFhNumber, local_username: input.localUsername },
    { account },
  )
}

export function removeContact(account: AccountAuth, targetAccountId: string): Promise<void> {
  return del<void>(`/contacts/${encodeURIComponent(targetAccountId)}`, undefined, { account })
}

export function listBlocks(account: AccountAuth): Promise<BlockedAccount[]> {
  return get<BlockedAccount[]>('/blocks', { account })
}

/** Envelopes between two accounts blocked in either direction are dropped silently. */
export function blockAccount(account: AccountAuth, targetAccountId: string): Promise<void> {
  return post<void>(`/blocks/${encodeURIComponent(targetAccountId)}`, undefined, { account })
}

export function unblockAccount(account: AccountAuth, targetAccountId: string): Promise<void> {
  return del<void>(`/blocks/${encodeURIComponent(targetAccountId)}`, undefined, { account })
}
