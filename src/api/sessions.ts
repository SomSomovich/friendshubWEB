import type { AccountAuth } from './auth'
import { del, get, post } from './client'

export type SessionInfo = {
  id: string
  ipAddress: string
  userAgent: string
  createdAt: number
  expiresAt: number
  revokedAt: number | null
  isCurrent: boolean
}

export function listSessions(account: AccountAuth): Promise<SessionInfo[]> {
  return get<SessionInfo[]>('/sessions', { account })
}

export function revokeSession(account: AccountAuth, sessionId: string): Promise<void> {
  return del<void>(`/sessions/${encodeURIComponent(sessionId)}`, undefined, { account })
}

/** Revokes every session including the current one. */
export function revokeAllSessions(account: AccountAuth): Promise<number> {
  return post<{ revoked: number }>('/sessions/revoke-all', undefined, { account }).then(
    (response) => response.revoked,
  )
}
