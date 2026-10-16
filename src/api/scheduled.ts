import type { AccountAuth } from './auth'
import { del, get } from './client'

export type ScheduledEnvelope = {
  envelopeId: string
  conversationId: string | null
  recipientAccountId: string
  recipientDeviceNumber: number
  envelopeType: number
  clientTimestamp: number
  sendAt: number
}

export function listScheduled(account: AccountAuth): Promise<ScheduledEnvelope[]> {
  return get<ScheduledEnvelope[]>('/scheduled', { account })
}

export function cancelScheduled(account: AccountAuth, envelopeId: string): Promise<void> {
  return del<void>(`/scheduled/${encodeURIComponent(envelopeId)}`, undefined, { account })
}
