import { buildEnvelope, encryptForDevice, resolvePeerDevices } from '../crypto/envelopes'
import { encodePayload } from '../crypto/payloads'
import type { Account, Envelope } from '../types'
import { getActiveClientOrNull } from '../ws/activeClient'
import {
  ENVELOPE_TYPE_CALL_ANSWER,
  ENVELOPE_TYPE_CALL_HANGUP,
  ENVELOPE_TYPE_CALL_ICE,
  ENVELOPE_TYPE_CALL_OFFER,
  ENVELOPE_TYPE_CALL_REJECT,
} from '../ws/envelopeTypes'
import type { CallSignalKind } from './types'

/**
 * Outgoing call signalling.
 *
 * Every frame is a JSON payload encrypted pairwise for each of the peer's
 * devices and uploaded in one batch — the same path a message takes, with a
 * different envelope type. The server never reads any of it; it only knows that
 * an envelope of type 10..14 was addressed to somebody.
 */

/**
 * The peer has no registered device, so there is nobody to ring.
 *
 * Its own type rather than a message string: the caller turns it into one of two
 * different sentences, and matching on prose would break the moment either the
 * wording or the language changed.
 */
export class NoPeerDeviceError extends Error {
  constructor(peerAccountId: string) {
    super(`[calls] ${peerAccountId} has no device to signal`)
    this.name = 'NoPeerDeviceError'
  }
}

/**
 * There is no open socket to signal over.
 *
 * Checked here rather than before the call screen opens, because the screen is
 * the right place to report it: a call that failed to leave the device is a fact
 * about the call, and the user should see the dial screen and the reason rather
 * than watch a button do nothing.
 */
export class NoConnectionError extends Error {
  constructor() {
    super('[calls] no open connection to signal over')
    this.name = 'NoConnectionError'
  }
}

const ENVELOPE_TYPE_BY_KIND: Record<CallSignalKind, number> = {
  offer: ENVELOPE_TYPE_CALL_OFFER,
  answer: ENVELOPE_TYPE_CALL_ANSWER,
  ice: ENVELOPE_TYPE_CALL_ICE,
  hangup: ENVELOPE_TYPE_CALL_HANGUP,
  reject: ENVELOPE_TYPE_CALL_REJECT,
}

/** Sends the batch, or reports that there is nothing to send it over. */
async function upload(envelopes: Envelope[]): Promise<void> {
  const client = getActiveClientOrNull()
  if (client === null || !client.isConnected) {
    throw new NoConnectionError()
  }
  await client.uploadEnvelopes(envelopes)
}

/**
 * One signalling frame, before it is encrypted.
 *
 * A discriminated union rather than the wire shape, because the wire fields are
 * mutually exclusive and a single record with three optionals is what lets
 * "an offer with no SDP" compile.
 */
export type OutgoingSignal =
  | { kind: 'offer' | 'answer'; sdp: string }
  | { kind: 'ice'; candidate: RTCIceCandidateInit }
  | { kind: 'hangup' | 'reject'; reason?: string }

/**
 * Encrypts and uploads one signalling frame for every device of the peer.
 *
 * Deliberately one frame per call: ICE candidates are sent as they are gathered
 * and must not be batched (API brief §4.11), so the caller queues these and the
 * wire order is the order they were queued in.
 */
export async function sendCallSignal(
  account: Account,
  peerAccountId: string,
  conversationId: string | null,
  callId: string,
  signal: OutgoingSignal,
): Promise<void> {
  const devices = await resolvePeerDevices(account, peerAccountId)
  if (devices.length === 0) {
    throw new NoPeerDeviceError(peerAccountId)
  }

  const payloadHex = encodePayload({
    call_id: callId,
    kind: signal.kind,
    sdp: signal.kind === 'offer' || signal.kind === 'answer' ? signal.sdp : null,
    candidate: signal.kind === 'ice' ? signal.candidate : null,
    reason: signal.kind === 'hangup' || signal.kind === 'reject' ? (signal.reason ?? null) : null,
  })
  const envelopeType = ENVELOPE_TYPE_BY_KIND[signal.kind]

  // Sequential: `encryptForDevice` may have to establish a session first, and the
  // WASM module's state is not safe to mutate from two calls at once.
  const envelopes: Envelope[] = []
  for (const device of devices) {
    const encrypted = await encryptForDevice(
      account,
      peerAccountId,
      device.deviceNumber,
      payloadHex,
    )
    envelopes.push(
      buildEnvelope({
        senderAccountId: account.id,
        senderDeviceNumber: account.deviceNumber,
        recipientAccountId: peerAccountId,
        recipientDeviceNumber: device.deviceNumber,
        envelopeType,
        isPrekeyMessage: encrypted.isPrekeyMessage,
        ciphertextHex: encrypted.ciphertextHex,
        conversationId,
      }),
    )
  }

  await upload(envelopes)
}
