import { recordCall as recordCallApi, type CallStatus } from '../api/webrtc'
import type { Account } from '../types'
import { nowSeconds } from '../utils/time'
import type { CallDirection } from './types'

/**
 * Filing a finished call in the account's history.
 *
 * The server validates that the timestamps are plausible (`started_at` is not in
 * the future, `ended_at` is not before it), so the end is clamped rather than
 * trusted: a call cancelled within the same second it started would otherwise
 * send `ended_at < started_at` and be rejected outright.
 *
 * Never throws. A missing history row costs a line in a list; surfacing it as an
 * error would mean a toast about bookkeeping in the middle of hanging up.
 */

export type FinishedCall = {
  account: Account
  peerAccountId: string
  direction: CallDirection
  status: CallStatus
  /** Unix seconds when this device started or received the call. */
  startedAt: number
}

export async function recordFinishedCall(call: FinishedCall): Promise<void> {
  const endedAt = Math.max(nowSeconds(), call.startedAt)

  try {
    await recordCallApi(call.account, {
      peerAccountId: call.peerAccountId,
      direction: call.direction,
      status: call.status,
      startedAt: call.startedAt,
      endedAt,
    })
  } catch (error) {
    console.warn('[calls] the call was not recorded in the history', error)
  }
}
