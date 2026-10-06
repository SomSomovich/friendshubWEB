import { create } from 'zustand'
import type { CallDirection, CallPhase } from '../calls/types'

/**
 * What the call overlay draws.
 *
 * A store rather than component state because the call is not owned by any
 * screen: it is started from a header, a menu or a profile, it outlives all of
 * them, and an incoming call has to appear wherever the user happens to be. The
 * orchestrator (`src/calls/manager.ts`) is the only writer; components only read.
 *
 * The media streams live here too. They are not React state in any meaningful
 * sense — they are handles to browser resources — but a component still has to
 * re-render when one arrives to attach it to a `<video>`, and this is the
 * smallest thing that achieves that.
 */

export type CallUiState = {
  phase: CallPhase
  callId: string | null
  peerAccountId: string | null
  /** The peer's display name, once known; `null` while it is being read. */
  peerName: string | null
  withVideo: boolean
  direction: CallDirection | null
  /** Unix seconds when the media path came up; drives the duration timer. */
  connectedAt: number | null
  speakerOn: boolean
  cameraOff: boolean
  /** True once a remote video track has arrived. */
  hasRemoteVideo: boolean
  /** A sentence to show on the call screen, when something went wrong. */
  error: string | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
}

const IDLE: CallUiState = {
  phase: 'idle',
  callId: null,
  peerAccountId: null,
  peerName: null,
  withVideo: false,
  direction: null,
  connectedAt: null,
  speakerOn: false,
  cameraOff: false,
  hasRemoteVideo: false,
  error: null,
  localStream: null,
  remoteStream: null,
}

export type CallStoreState = CallUiState & {
  /** Merges a patch into the current call state. */
  update: (patch: Partial<CallUiState>) => void
  /** Back to no call at all; the overlay unmounts. */
  reset: () => void
}

export const useCallStore = create<CallStoreState>((set) => ({
  ...IDLE,

  update: (patch) => {
    set(patch)
  },

  reset: () => {
    set(IDLE)
  },
}))
