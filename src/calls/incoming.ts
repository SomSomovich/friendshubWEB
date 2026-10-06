import { getAccountProfile } from '../api/profile'
import type { CallPayload } from '../crypto/payloads'
import { i18n } from '../i18n'
import type { Account, Envelope } from '../types'
import { activeCall, beginCall, finish, publish, queueSignal, type ActiveCall } from './activeCall'
import { markFailed, watchSocket } from './callEvents'
import { notifyCall } from './notify'
import { startRingtone } from './ringtone'
import { sendCallSignal } from './signal'

/**
 * The callee's half of a call: what arrives over the socket, and what each kind
 * of frame means.
 *
 * Split from `manager.ts` because the two directions share almost nothing but
 * the active-call object they drive — this one is all reaction and buffering,
 * that one is all acquisition and offering. Accepting and declining live in
 * `answer.ts`.
 */

/**
 * How long an unanswered call rings.
 *
 * The brief's figure, and a reasonable one: long enough to dig a phone out of a
 * pocket, short enough that a caller is not left listening to nothing.
 */
const INCOMING_TIMEOUT_MS = 60_000

/** Routes one decrypted call signalling payload. Never throws. */
export function handleCallSignal(
  account: Account,
  envelope: Envelope,
  payload: CallPayload | null,
): void {
  if (payload === null) {
    console.warn('[calls] a call envelope carried no readable payload')
    return
  }

  switch (payload.kind) {
    case 'offer':
      onOffer(account, envelope, payload)
      return
    case 'answer':
      onAnswer(payload)
      return
    case 'ice':
      onIce(payload)
      return
    case 'hangup':
      onHangup(payload)
      return
    case 'reject':
      onReject(payload)
      return
  }
}

function onOffer(account: Account, envelope: Envelope, payload: CallPayload): void {
  const sdp = payload.sdp
  if (sdp === null || sdp.length === 0) {
    console.warn('[calls] an offer arrived without an SDP')
    return
  }

  const busy = activeCall()
  if (busy !== null) {
    // A redelivery of the offer for the call already on this screen is not a
    // second call — the server replays anything it did not get an ack for — and
    // answering it with a busy rejection would tell the caller that their own
    // ringing call had been refused.
    if (busy.callId !== payload.call_id) {
      // One call per tab, and the caller is told *why* nothing rings rather
      // than being left listening to a tone that will never be picked up.
      void sendCallSignal(
        account,
        envelope.senderAccountId,
        envelope.conversationId,
        payload.call_id,
        { kind: 'reject', reason: 'busy' },
      ).catch((error: unknown) => {
        console.warn('[calls] the busy rejection was not sent', error)
      })
    }
    return
  }

  const call = beginCall({
    account,
    peerAccountId: envelope.senderAccountId,
    peerName: null,
    conversationId: envelope.conversationId,
    withVideo: offerHasVideo(sdp),
    direction: 'incoming',
    phase: 'incoming',
    pendingOfferSdp: sdp,
  })
  watchSocket(call)

  call.ringtone = startRingtone()
  call.answerTimeout = setTimeout(() => {
    onTimeout(call)
  }, INCOMING_TIMEOUT_MS)

  void loadPeerName(call)
}

/** Nobody picked up in time. Told to the caller, then filed as missed. */
function onTimeout(call: ActiveCall): void {
  if (activeCall() !== call || call.phase !== 'incoming') {
    return
  }
  void queueSignal(call, { kind: 'reject', reason: 'timeout' }).catch((error: unknown) => {
    console.warn('[calls] the timeout rejection was not sent', error)
  })
  finish(call, 'missed')
}

function onAnswer(payload: CallPayload): void {
  const call = activeCall()
  // `phase` as well as `direction`: two of the peer's devices can both answer,
  // and applying a second answer to a connection that is already negotiating
  // throws — which would tear down a call that had just succeeded.
  if (
    call === null ||
    call.callId !== payload.call_id ||
    call.direction !== 'outgoing' ||
    call.phase !== 'outgoing'
  ) {
    return
  }
  const sdp = payload.sdp
  if (sdp === null || call.session === null) {
    return
  }

  call.phase = 'active'
  publish(call)
  void call.session.acceptAnswer(sdp).catch((error: unknown) => {
    markFailed(call, i18n.t('call.connectionFailed'), error)
  })
}

function onIce(payload: CallPayload): void {
  const call = activeCall()
  if (call === null || call.callId !== payload.call_id) {
    return
  }
  const candidate = toCandidate(payload.candidate)
  if (candidate === null) {
    return
  }

  // A callee has no peer connection until it answers, and the caller trickles
  // candidates the moment the offer goes out — so they are held, not dropped.
  if (call.session === null) {
    call.pendingRemoteCandidates.push(candidate)
    return
  }
  void call.session.addRemoteCandidate(candidate).catch((error: unknown) => {
    console.warn('[calls] a remote ICE candidate was rejected', error)
  })
}

function onHangup(payload: CallPayload): void {
  const call = activeCall()
  if (call === null || call.callId !== payload.call_id) {
    return
  }
  finish(call, call.failed ? 'failed' : hangupStatus(call))
}

function onReject(payload: CallPayload): void {
  const call = activeCall()
  if (call === null || call.callId !== payload.call_id) {
    return
  }
  if (call.direction === 'outgoing') {
    notifyCall('info', i18n.t('call.rejected'))
  }
  // `rejected` covers both a decline and a busy line: from the caller's side
  // they are the same fact — the other end said no.
  finish(call, call.failed ? 'failed' : 'rejected')
}

/** What the peer ending the call means for the history. */
function hangupStatus(call: ActiveCall): 'completed' | 'missed' | 'cancelled' {
  if (call.connected) {
    return 'completed'
  }
  // Still ringing when the caller gave up: it was missed, not declined.
  return call.phase === 'incoming' ? 'missed' : 'cancelled'
}

async function loadPeerName(call: ActiveCall): Promise<void> {
  try {
    const profile = await getAccountProfile(call.account, call.peerAccountId)
    if (activeCall() !== call) {
      return
    }
    call.peerName = profile.username
    publish(call)
  } catch (error) {
    // The overlay falls back to a generic line; the call still rings.
    console.warn('[calls] the caller profile could not be read', error)
  }
}

/** Whether an offer proposed a video stream at all. */
function offerHasVideo(sdp: string): boolean {
  return /^m=video /m.test(sdp)
}

/** A candidate the peer sent, or `null` when the payload is not one. */
function toCandidate(value: unknown): RTCIceCandidateInit | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const candidate = (value as { candidate?: unknown }).candidate
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return null
  }
  return value as RTCIceCandidateInit
}
