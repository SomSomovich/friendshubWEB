import type { CallDirection } from '../api/webrtc'

/**
 * Types shared by the call layer.
 *
 * `CallDirection` and `CallStatus` already have a home next to the HTTP client
 * that records a finished call (`src/api/webrtc.ts`), so they are imported from
 * there rather than declared a second time: a status that means one thing to the
 * recorder and another to the state machine would be a silent bug.
 */

/** The five signalling frames; each maps to one `ENVELOPE_TYPE_CALL_*`. */
export type CallSignalKind = 'offer' | 'answer' | 'ice' | 'hangup' | 'reject'

/**
 * What the call overlay is showing.
 *
 * `idle` means there is no call at all. `outgoing` and `incoming` are the two
 * ways a call can be ringing; `active` is everything from "answered" onwards —
 * the media connection coming up is a separate fact (`connectedAt`), because a
 * call can be answered and still be negotiating.
 */
export type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'active'

export type { CallDirection }
