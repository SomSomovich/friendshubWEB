import type { AccountAuth } from './auth'
import { post } from './client'

export type AccountSummary = {
  accountId: string; userId: number; fhNumber: string; username: string
  avatarUrl: string | null; customStatusText: string | null
  customStatusEmoji: string | null; customStatusExpiresAt: number | null
}

/** Each request respects the 200-ID cap; omitted/deleted accounts stay absent. */
export async function getAccountsBatch(account: AccountAuth, accountIds: string[]): Promise<AccountSummary[]> {
  const ids = [...new Set(accountIds)]
  const result: AccountSummary[] = []
  for (let offset = 0; offset < ids.length; offset += 200) {
    result.push(...await post<AccountSummary[]>('/accounts/batch', { account_ids: ids.slice(offset, offset + 200) }, { account }))
  }
  return result
}
