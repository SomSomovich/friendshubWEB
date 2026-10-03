import type { AccountAuth } from './auth'
import { del, get, post } from './client'

/**
 * Calls: the ICE configuration the peer connection needs, plus the call-history
 * records the UI lists. Signalling itself is not HTTP — offers, answers and ICE
 * candidates travel as encrypted envelopes (`ENVELOPE_TYPE_CALL_*`) and arrive
 * through the WebSocket layer.
 */

export type IceServersResponse = {
  /**
   * Shaped for `RTCPeerConnection` directly, so the DOM type is used: its
   * optional `username`/`credential` match how the server omits them for STUN.
   */
  iceServers: RTCIceServer[]
  /** Lifetime of the TURN credentials, which are HMAC-derived and short-lived. */
  ttlSeconds: number
}

export type CallDirection = 'incoming' | 'outgoing'
export type CallStatus = 'completed' | 'missed' | 'rejected' | 'cancelled' | 'failed'

export type CallRecord = {
  id: string
  peerAccountId: string
  direction: CallDirection
  status: CallStatus
  startedAt: number
  endedAt: number
}

export type CallRecordInput = {
  peerAccountId: string
  direction: CallDirection
  status: CallStatus
  startedAt: number
  endedAt: number
}

export function getIceServers(account: AccountAuth): Promise<IceServersResponse> {
  return get<IceServersResponse>('/webrtc/ice-servers', { account })
}

/** Records a finished call; the server validates the timestamps are plausible. */
export function recordCall(account: AccountAuth, input: CallRecordInput): Promise<CallRecord> {
  return post<CallRecord>(
    '/calls',
    {
      peer_account_id: input.peerAccountId,
      direction: input.direction,
      status: input.status,
      started_at: input.startedAt,
      ended_at: input.endedAt,
    },
    { account },
  )
}

export function listCalls(
  account: AccountAuth,
  query: { peerAccountId?: string; limit?: number } = {},
): Promise<CallRecord[]> {
  return get<CallRecord[]>('/calls', {
    account,
    query: { peer_account_id: query.peerAccountId ?? null, limit: query.limit ?? null },
  })
}

export function deleteCall(account: AccountAuth, callId: string): Promise<void> {
  return del<void>(`/calls/${encodeURIComponent(callId)}`, undefined, { account })
}

export function clearCallHistory(account: AccountAuth): Promise<void> {
  return post<void>('/calls/clear', undefined, { account })
}
