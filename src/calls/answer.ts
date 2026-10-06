import { i18n } from '../i18n'
import {
  activeCall,
  clearAnswerTimeout,
  finish,
  openSignals,
  publish,
  queueSignal,
  stopRing,
  type ActiveCall,
} from './activeCall'
import { markFailed, sessionEvents } from './callEvents'
import { getIceServersFor } from './iceServers'
import { acquireLocalMedia, stopStream } from './media'
import { CallSession } from './session'

/**
 * The callee's two answers to a ringing call: pick it up, or refuse it.
 *
 * The other half of the incoming path — what to do when a signal *arrives* —
 * is in `incoming.ts`. They are apart because accepting is a media sequence with
 * the same shape as placing a call, while handling a signal is routing.
 */

export async function acceptCall(): Promise<void> {
  const call = activeCall()
  const sdp = call?.pendingOfferSdp ?? null
  if (call === null || call.phase !== 'incoming' || sdp === null) {
    return
  }

  stopRing(call)
  clearAnswerTimeout(call)
  // The call screen replaces the ringing overlay immediately: acquiring the
  // microphone takes a moment, and a tap that appears to do nothing is worse
  // than a screen that is visibly working.
  call.phase = 'active'
  publish(call)

  let media: MediaStream
  try {
    media = await acquireLocalMedia(call.withVideo)
  } catch (error) {
    markFailed(call, i18n.t('call.mediaError'), error)
    return
  }
  // The user may have ended the call while the browser was asking for the
  // camera; the stream that arrived afterwards has to be released by hand.
  if (activeCall() !== call) {
    stopStream(media)
    return
  }
  call.localStream = media
  publish(call)

  const iceServers = await loadIceServers(call)
  if (iceServers === null) {
    return
  }

  const session = new CallSession(iceServers, media, sessionEvents(call))
  call.session = session
  // Handed over before the answer: the candidates arrived while this device was
  // still ringing, and the session queues anything it cannot apply yet, so the
  // order between the two does not matter.
  for (const candidate of call.pendingRemoteCandidates.splice(0)) {
    await session.addRemoteCandidate(candidate).catch((error: unknown) => {
      console.warn('[calls] a queued ICE candidate was rejected', error)
    })
  }

  let answer: string
  try {
    answer = await session.acceptOffer(sdp)
  } catch (error) {
    markFailed(call, i18n.t('call.connectionFailed'), error)
    return
  }
  if (activeCall() !== call) {
    return
  }

  await queueSignal(call, { kind: 'answer', sdp: answer })
    .then(() => {
      openSignals(call)
    })
    .catch((error: unknown) => {
      markFailed(call, i18n.t('call.answerFailed'), error)
    })
}

/** Declines a call that has not been answered. */
export function declineCall(): void {
  const call = activeCall()
  if (call === null || call.phase !== 'incoming') {
    return
  }

  void queueSignal(call, { kind: 'reject', reason: 'declined' }).catch((error: unknown) => {
    console.warn('[calls] the rejection was not sent', error)
  })
  finish(call, 'rejected')
}

async function loadIceServers(call: ActiveCall): Promise<RTCIceServer[] | null> {
  try {
    const servers = await getIceServersFor(call.account)
    return activeCall() === call ? servers : null
  } catch (error) {
    markFailed(call, i18n.t('call.iceError'), error)
    return null
  }
}
