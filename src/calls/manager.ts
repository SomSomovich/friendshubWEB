import { i18n } from '../i18n'
import type { Account } from '../types'
import {
  activeCall,
  beginCall,
  finish,
  openSignals,
  publish,
  queueSignal,
} from './activeCall'
import { endingStatus, markFailed, sessionEvents, watchSocket } from './callEvents'
import { getIceServersFor } from './iceServers'
import { acquireLocalMedia, stopStream, switchCameraStream } from './media'
import { notifyCall } from './notify'
import { CallSession } from './session'
import { NoConnectionError, NoPeerDeviceError } from './signal'

/**
 * The caller's half of a call, plus the controls both halves share.
 *
 * Starting one is a sequence of things that can each fail on their own — the
 * microphone, the ICE configuration, the offer — and each failure is reported
 * against the call screen rather than by making it disappear. The call object is
 * created *before* any of that runs, which is what lets the screen be up while
 * the permission prompt is still open.
 */

export type StartCallInput = {
  peerAccountId: string
  /** Known from the open conversation or the profile; `null` if neither has it. */
  peerName: string | null
  /** The conversation the call belongs to, when it was started from one. */
  conversationId?: string | null
  withVideo: boolean
}

export async function startCall(account: Account, input: StartCallInput): Promise<void> {
  if (activeCall() !== null) {
    notifyCall('info', i18n.t('call.busy'))
    return
  }

  // The call screen opens before anything that can fail — the microphone
  // prompt, the ICE configuration, the socket itself — so what the user sees is
  // a call being placed, not a button that did nothing. Every failure below is
  // reported against that screen.
  const call = beginCall({
    account,
    peerAccountId: input.peerAccountId,
    peerName: input.peerName,
    conversationId: input.conversationId ?? null,
    withVideo: input.withVideo,
    direction: 'outgoing',
    phase: 'outgoing',
  })
  watchSocket(call)

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

  let iceServers: RTCIceServer[]
  try {
    iceServers = await getIceServersFor(account)
  } catch (error) {
    markFailed(call, i18n.t('call.iceError'), error)
    return
  }
  if (activeCall() !== call) {
    return
  }

  const session = new CallSession(iceServers, media, sessionEvents(call))
  call.session = session

  let sdp: string
  try {
    sdp = await session.createOffer()
  } catch (error) {
    markFailed(call, i18n.t('call.startFailed'), error)
    return
  }
  if (activeCall() !== call) {
    return
  }

  await queueSignal(call, { kind: 'offer', sdp })
    .then(() => {
      openSignals(call)
    })
    .catch((error: unknown) => {
      markFailed(call, describeStartFailure(error), error)
    })
}

/**
 * Why an offer never left the device.
 *
 * The two causes the user can act on are told apart by type rather than by
 * matching on a message: one means "they are signed in nowhere", the other
 * "your connection is down", and they lead to different next steps.
 */
function describeStartFailure(error: unknown): string {
  if (error instanceof NoPeerDeviceError) {
    return i18n.t('call.noDevice')
  }
  if (error instanceof NoConnectionError) {
    return i18n.t('call.noConnection')
  }
  return i18n.t('call.startFailed')
}

/** Ends the call from the local side, whichever side that is. */
export function hangUp(): void {
  const call = activeCall()
  if (call === null) {
    return
  }

  // An incoming call nobody answered is refused rather than hung up: the caller
  // is still ringing and has to be told, or it would ring until it timed out.
  const signal = call.phase === 'incoming' ? { kind: 'reject' as const, reason: 'declined' } : { kind: 'hangup' as const }
  void queueSignal(call, signal).catch((error: unknown) => {
    console.warn('[calls] the end-of-call signal was not sent', error)
  })
  finish(call, endingStatus(call, true))
}

/** The speaker toggle. Its effect on the audio route lives in `speaker.ts`. */
export function toggleSpeaker(): void {
  const call = activeCall()
  if (call === null) {
    return
  }
  call.speakerOn = !call.speakerOn
  publish(call)
}

/** Turns the outgoing video on or off without touching the audio. */
export function toggleVideo(): void {
  const call = activeCall()
  if (call === null || !call.withVideo) {
    return
  }
  call.cameraOff = !call.cameraOff
  call.session?.setVideoEnabled(!call.cameraOff)
  publish(call)
}

/**
 * Moves to another camera.
 *
 * Mobile and desktop are the same operation here — the next device in the
 * browser's own video-input list — because `replaceTrack` does not care whether
 * the new track is a different camera or the same sensor facing the other way.
 */
export async function switchCamera(): Promise<void> {
  const call = activeCall()
  const track = call?.localStream?.getVideoTracks()[0]
  if (call === null || track === undefined) {
    return
  }

  try {
    const next = await switchCameraStream(track.getSettings().deviceId ?? null)
    if (activeCall() !== call) {
      if (next !== null) {
        stopStream(next.stream)
      }
      return
    }
    if (next === null) {
      notifyCall('info', i18n.t('call.noOtherCamera'))
      return
    }

    next.track.enabled = !call.cameraOff
    await call.session?.replaceVideoTrack(next.track)
    track.stop()

    // A *new* stream object, not an edited one: the preview attaches the stream
    // it is given, and mutating the old one would leave the `<video>` showing a
    // track that is already stopped.
    const audio = call.localStream?.getAudioTracks() ?? []
    call.localStream = new MediaStream([...audio, next.track])
    publish(call)
  } catch (error) {
    console.warn('[calls] the camera could not be switched', error)
    notifyCall('error', i18n.t('call.cameraFailed'))
  }
}
