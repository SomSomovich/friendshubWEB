import type { CallStatus } from '../api/webrtc'
import { i18n } from '../i18n'
import { nowSeconds } from '../utils/time'
import { getActiveClientOrNull } from '../ws/activeClient'
import {
  activeCall,
  clearAnswerTimeout,
  finish,
  publish,
  queueSignal,
  stopRing,
  type ActiveCall,
} from './activeCall'
import { notifyCall } from './notify'
import type { CallSessionEvents } from './session'

/**
 * How the call reacts to things that happen *to* it.
 *
 * The peer connection's own lifecycle, the socket dropping, and the bookkeeping
 * of a call that has gone wrong — everything that is a reaction rather than an
 * action. Kept apart from `activeCall.ts` so that file stays the data and the
 * queue, and apart from `manager.ts` so the outgoing path is not also the place
 * where a dead socket is handled.
 */

/**
 * Marks a call that has gone wrong but is still on screen.
 *
 * A failed microphone permission is not a reason to make the screen vanish — the
 * user gets a sentence and an end button, which is what "handle it gracefully"
 * has to mean when the alternative is a call that disappears mid-tap.
 */
export function markFailed(call: ActiveCall, message: string, cause: unknown): void {
  if (activeCall() !== call) {
    return
  }
  call.failed = true
  console.warn('[calls] the call failed', cause)
  stopRing(call)
  clearAnswerTimeout(call)
  publish(call, { error: message })
  notifyCall('error', message)
}

/** The status a call gets when the user or the peer ends it. */
export function endingStatus(call: ActiveCall, initiatedLocally: boolean): CallStatus {
  if (call.failed) {
    return 'failed'
  }
  if (call.connected) {
    return 'completed'
  }
  if (call.phase === 'incoming') {
    return initiatedLocally ? 'rejected' : 'missed'
  }
  return 'cancelled'
}

/** The peer connection's own events, as the call store wants them. */
export function sessionEvents(call: ActiveCall): CallSessionEvents {
  return {
    onIceCandidate: (candidate) => {
      void queueSignal(call, { kind: 'ice', candidate }).catch((error: unknown) => {
        console.warn('[calls] an ICE candidate was not sent', error)
      })
    },
    onConnected: () => {
      if (activeCall() !== call || call.connected) {
        return
      }
      call.connected = true
      call.connectedAt = nowSeconds()
      publish(call)
    },
    onFailed: (detail) => {
      if (activeCall() !== call) {
        return
      }
      notifyCall('error', i18n.t('call.connectionFailed'))
      finish(call, 'failed')
      console.warn(`[calls] the media path failed: ${detail}`)
    },
    onRemoteStream: (stream) => {
      if (activeCall() !== call) {
        return
      }
      call.remoteStream = stream
      publish(call)
    },
    onRemoteVideo: () => {
      if (activeCall() !== call) {
        return
      }
      call.hasRemoteVideo = true
      publish(call)
    },
  }
}

/**
 * A call dies with the socket.
 *
 * Not a friendlier "reconnecting" state: the WebSocket is the only path the
 * signalling takes, so a call whose socket is gone cannot be hung up cleanly
 * either. The overlay closes and says why.
 */
export function watchSocket(call: ActiveCall): void {
  const client = getActiveClientOrNull()
  if (client === null) {
    return
  }
  call.detachSocket = client.on('disconnected', () => {
    if (activeCall() !== call) {
      return
    }
    notifyCall('error', i18n.t('call.connection_lost'))
    finish(call, 'failed')
  })
}
