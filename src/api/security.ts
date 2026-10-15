import type { AccountAuth } from './auth'
import { get } from './client'

export type SecurityEvent = {
  id: string; eventType: string; ipAddress: string | null
  userAgent: string | null; metadata: unknown; createdAt: number
}
export function listSecurityEvents(account: AccountAuth): Promise<SecurityEvent[]> {
  return get('/security/events', { account, query: { limit: 100 } })
}
