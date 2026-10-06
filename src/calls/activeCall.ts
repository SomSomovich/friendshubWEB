import type { CallStatus } from '../api/webrtc'
import { useCallStore, type CallUiState } from '../state/callStore'
import type { Account } from '../types'
import { nowSeconds } from '../utils/time'
import { uuidV7 } from '../utils/uuid'
import { recordFinishedCall } from './recorder'
import type { Ringtone } from './ringtone'
import type { CallSession } from './session'
import { sendCallSignal, type OutgoingSignal } from './signal'
import type { CallDirection } from './types'

/**
 * The one call this tab can have, and the queue its signalling goes out on.
 *
 * There is no call without an account, no two calls at once, and no screen that
 * owns one — so the call is a module-level singleton exactly like the WebSocket
 * (`src/ws/activeClient.ts`), and the three paths that drive it — `manager.ts`,
 * `incoming.ts` and `answer.ts` — share this object rather than passing one
 * around. What *reacts* to a call (the session's own events, the socket dying)
 * lives in `callEvents.ts`.
 */

export type ActiveCall = {
  account: Account
  callId: string
  peerAccountId: string
  /** The peer's display name; filled in asynchronously for an incoming call. */
  peerName: string | null
  conversationId: string | null
  withVideo: boolean
  direction: CallDirection
  phase: 'outgoing' | 'incoming' | 'active'
  /** Unix seconds when this device started or received the call. */
  startedAt: number
  /** The offer an incoming call has not answered yet. */
  pendingOfferSdp: string | null
  /** Candidates that arrived before the callee had a peer connection. */
  pendingRemoteCandidates: RTCIceCandidateInit[]
  session: CallSession | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  ringtone: Ringtone | null
  answerTimeout: ReturnType<typeof setTimeout> | null
  detachSocket: (() => void) | null
  /** Serialises signalling, so frames leave in the order they were queued. */
  signals: Promise<void>
  /**
   * False until the offer (or the answer) is on the wire.
   *
   * `setLocalDescription` starts gathering immediately, so candidates exist
   * *while* the offer is still being encrypted for each device — and a candidate
   * that reached the peer before the description that gives it meaning would be
   * unusable there. Until the description has gone out, candidates wait in
   * `heldCandidates`.
   */
  signalsOpen: boolean
  heldCandidates: RTCIceCandidateInit[]
  connected: boolean
  connectedAt: number | null
  speakerOn: boolean
  cameraOff: boolean
  hasRemoteVideo: boolean
  /** Something went wrong and the call will not recover. */
  failed: boolean
  /** Set once the call is in the history, so it is never filed twice. */
  recorded: boolean
}

export type CallInit = {
  account: Account
  peerAccountId: string
  peerName: string | null
  conversationId: string | null
  withVideo: boolean
  direction: CallDirection
  phase: 'outgoing' | 'incoming'
  pendingOfferSdp?: string | null
}

let current: ActiveCall | null = null

/** The call in progress, for the modules that drive it. */
export function activeCall(): ActiveCall | null {
  return current
}

export function beginCall(init: CallInit): ActiveCall {
  const call: ActiveCall = {
    account: init.account,
    // v7, like every other identifier this client mints: the contract asks for
    // it and the ordering it carries costs nothing.
    callId: uuidV7(),
    peerAccountId: init.peerAccountId,
    peerName: init.peerName,
    conversationId: init.conversationId,
    withVideo: init.withVideo,
    direction: init.direction,
    phase: init.phase,
    startedAt: nowSeconds(),
    pendingOfferSdp: init.pendingOfferSdp ?? null,
    pendingRemoteCandidates: [],
    session: null,
    localStream: null,
    remoteStream: null,
    ringtone: null,
    answerTimeout: null,
    detachSocket: null,
    signals: Promise.resolve(),
    signalsOpen: false,
    heldCandidates: [],
    connected: false,
    connectedAt: null,
    // A video call starts on the loudspeaker, an audio call on the earpiece —
    // the two things a phone does by default, and the reason the toggle exists.
    speakerOn: init.withVideo,
    cameraOff: false,
    hasRemoteVideo: false,
    failed: false,
    recorded: false,
  }

  current = call
  publish(call)
  return call
}

/** Mirrors the call into the store the overlay reads. */
export function publish(call: ActiveCall, patch: Partial<CallUiState> = {}): void {
  useCallStore.getState().update({
    phase: call.phase,
    callId: call.callId,
    peerAccountId: call.peerAccountId,
    peerName: call.peerName,
    withVideo: call.withVideo,
    direction: call.direction,
    connectedAt: call.connectedAt,
    speakerOn: call.speakerOn,
    cameraOff: call.cameraOff,
    hasRemoteVideo: call.hasRemoteVideo,
    localStream: call.localStream,
    remoteStream: call.remoteStream,
    ...patch,
  })
}

/**
 * Queues one signalling frame behind the ones already going out.
 *
 * The chain matters for the offer: its ICE candidates are gathered while the
 * offer is still being encrypted for each device, and a candidate that reached
 * the peer first would be unusable. The returned promise still rejects for the
 * caller; only the chain itself swallows, so one failed frame does not poison
 * every frame after it.
 */
export function queueSignal(call: ActiveCall, signal: OutgoingSignal): Promise<void> {
  if (signal.kind === 'ice' && !call.signalsOpen) {
    call.heldCandidates.push(signal.candidate)
    return Promise.resolve()
  }

  const sent = call.signals.then(() =>
    sendCallSignal(call.account, call.peerAccountId, call.conversationId, call.callId, signal),
  )
  call.signals = sent.catch(() => {})
  return sent
}

/**
 * Releases the candidates held while the offer or answer was going out.
 *
 * Called once the description has actually been sent, so the queue it opens is
 * already behind it: `queueSignal` extends the chain synchronously, which is
 * what makes the order the peer sees the order of these two statements.
 */
export function openSignals(call: ActiveCall): void {
  call.signalsOpen = true
  for (const candidate of call.heldCandidates.splice(0)) {
    void queueSignal(call, { kind: 'ice', candidate }).catch((error: unknown) => {
      console.warn('[calls] a held ICE candidate was not sent', error)
    })
  }
}

/** Ends the call, locally, and files it. Safe to call twice. */
export function finish(call: ActiveCall, status: CallStatus | null): void {
  if (current !== call) {
    return
  }
  current = null

  stopRing(call)
  clearAnswerTimeout(call)
  call.detachSocket?.()
  call.detachSocket = null
  call.session?.close()
  for (const track of call.localStream?.getTracks() ?? []) {
    track.stop()
  }
  call.session = null
  call.localStream = null
  call.remoteStream = null

  useCallStore.getState().reset()

  if (status !== null && !call.recorded) {
    call.recorded = true
    void recordFinishedCall({
      account: call.account,
      peerAccountId: call.peerAccountId,
      direction: call.direction,
      status,
      startedAt: call.startedAt,
    })
  }
}

export function stopRing(call: ActiveCall): void {
  call.ringtone?.stop()
  call.ringtone = null
}

export function clearAnswerTimeout(call: ActiveCall): void {
  if (call.answerTimeout !== null) {
    clearTimeout(call.answerTimeout)
    call.answerTimeout = null
  }
}
