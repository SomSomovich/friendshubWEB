import { getPeerBundle, listPeerDevices, type PeerDevice } from '../api/devices'
import { ApiError } from '../api/errors'
import { getCachedDevices, putCachedDevices } from '../storage/devices_cache'
import type { Account, Envelope } from '../types'
import { nowSeconds } from '../utils/time'
import { uuidV7 } from '../utils/uuid'
import { WasmError, encrypt, establishSession, type EncryptResult } from '../wasm'

/**
 * Envelope primitives shared by every send path: building one, and encrypting
 * for one device.
 *
 * They live here rather than in `send.ts` because `sent-saved` and attachment
 * key delivery need them too — and a shared module is the only way to keep those
 * from importing each other in a cycle.
 */

export type EnvelopeTarget = {
  accountId: string
  deviceNumber: number
}

export type BuildEnvelopeInput = {
  senderAccountId: string
  senderDeviceNumber: number
  recipientAccountId: string
  recipientDeviceNumber: number
  envelopeType: number
  isPrekeyMessage: boolean
  ciphertextHex: string
  conversationId: string | null
  clientTimestamp?: number
  envelopeId?: string
  senderIsBot?: boolean
}

export function buildEnvelope(input: BuildEnvelopeInput): Envelope {
  return {
    // v7, like the message ids: both are UUIDs the contract orders by creation
    // time, and the server keys its own records on this one.
    envelopeId: input.envelopeId ?? uuidV7(),
    senderAccountId: input.senderAccountId,
    senderDeviceNumber: input.senderDeviceNumber,
    recipientAccountId: input.recipientAccountId,
    recipientDeviceNumber: input.recipientDeviceNumber,
    envelopeType: input.envelopeType,
    isPrekeyMessage: input.isPrekeyMessage,
    ciphertext: input.ciphertextHex,
    clientTimestamp: input.clientTimestamp ?? nowSeconds(),
    conversationId: input.conversationId,
    senderIsBot: input.senderIsBot ?? false,
  }
}

/**
 * Devices to encrypt for, cached for five minutes.
 *
 * Only the *list* is cached. A prekey bundle is single-use — every fetch
 * consumes one of the peer's one-time prekeys — so bundles are always fetched
 * fresh, and only when a session has to be established at all.
 */
export async function resolvePeerDevices(
  account: Account,
  peerAccountId: string,
): Promise<PeerDevice[]> {
  const cached = await getCachedDevices(account.id, peerAccountId)
  if (cached !== null) {
    return cached
  }

  const devices = await listPeerDevices(account, peerAccountId)
  await putCachedDevices(account.id, peerAccountId, devices)
  return devices
}

/**
 * Encrypts one message for one device, establishing a session first only if
 * there is none.
 *
 * The module reports a missing session as a `no_session` error, which is what
 * makes this cheap: probing with an encrypt attempt avoids fetching (and
 * consuming) a prekey bundle for every single message.
 */
export async function encryptForDevice(
  account: Account,
  peerAccountId: string,
  peerDeviceNumber: number,
  plaintextHex: string,
): Promise<EncryptResult> {
  try {
    return await encrypt(
      account.id,
      peerAccountId,
      peerDeviceNumber,
      account.deviceNumber,
      plaintextHex,
    )
  } catch (error) {
    if (!(error instanceof WasmError) || error.code !== 'no_session') {
      throw error
    }
  }

  const bundle = await getPeerBundle(account, peerAccountId, peerDeviceNumber)
  await establishSession(
    account.id,
    peerAccountId,
    peerDeviceNumber,
    account.deviceNumber,
    JSON.stringify(bundle),
  )
  return encrypt(account.id, peerAccountId, peerDeviceNumber, account.deviceNumber, plaintextHex)
}

/** This account's own devices, excluding the one running right now. */
export async function resolveOwnOtherDevices(account: Account): Promise<PeerDevice[]> {
  const devices = await resolvePeerDevices(account, account.id)
  return devices.filter((device) => device.deviceNumber !== account.deviceNumber)
}

/** One envelope, encrypted for exactly one device. */
export async function pairwise(
  account: Account,
  recipientAccountId: string,
  recipientDeviceNumber: number,
  payloadHex: string,
  envelopeType: number,
  conversationId: string | null,
): Promise<Envelope> {
  const encrypted = await encryptForDevice(
    account,
    recipientAccountId,
    recipientDeviceNumber,
    payloadHex,
  )
  return buildEnvelope({
    senderAccountId: account.id,
    senderDeviceNumber: account.deviceNumber,
    recipientAccountId,
    recipientDeviceNumber,
    envelopeType,
    isPrekeyMessage: encrypted.isPrekeyMessage,
    ciphertextHex: encrypted.ciphertextHex,
    conversationId,
  })
}

/**
 * Whether a device cannot be given a session, as opposed to a send that failed.
 *
 * `replenish_required` is the server saying the target's pool of one-time
 * prekeys has run down to nothing, and a 404 is a device that no longer exists —
 * the device list is cached for five minutes, so a revoked one can still be in
 * it. Both are facts about that device, not about the message being sent, and
 * neither is something a retry would fix.
 */
export function isUnreachableDevice(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.code === 'replenish_required' || error.status === 404)
  )
}

export type PairwiseFanout = {
  /** One envelope per device that could be encrypted for. */
  envelopes: Envelope[]
  /** Devices left out because no session could be established with them. */
  unreachable: number[]
  /** The first of those failures, for a caller that has to explain itself. */
  cause: unknown
}

/**
 * Encrypts one payload for every device of one recipient, leaving out the ones
 * that cannot be reached.
 *
 * A device nobody uses any more, with an empty prekey pool, would otherwise make
 * its owner unwritable to everyone — even though each of their other devices
 * would have taken the message perfectly well. The price is that the message
 * plainly does not arrive on the device that was left out; it is not queued for
 * it and nothing retries.
 *
 * Sequential on purpose: each call may have to establish a session, and the
 * module's state is not safe to mutate from two of them at once.
 *
 * Returns what happened rather than deciding: a send to one peer and a fan-out
 * over a group's members want opposite answers when *nothing* could be reached,
 * and only the caller knows which it is doing.
 */
export async function pairwiseFanout(
  account: Account,
  recipientAccountId: string,
  devices: PeerDevice[],
  payloadHex: string,
  envelopeType: number,
  conversationId: string | null,
): Promise<PairwiseFanout> {
  const envelopes: Envelope[] = []
  const unreachable: number[] = []
  let cause: unknown = null

  for (const device of devices) {
    try {
      envelopes.push(
        await pairwise(
          account,
          recipientAccountId,
          device.deviceNumber,
          payloadHex,
          envelopeType,
          conversationId,
        ),
      )
    } catch (error) {
      if (!isUnreachableDevice(error)) {
        throw error
      }
      cause ??= error
      unreachable.push(device.deviceNumber)
    }
  }

  if (unreachable.length > 0) {
    console.warn(
      `[crypto] ${recipientAccountId}: no session for device(s) ${unreachable.join(', ')}, left out of this send`,
    )
  }
  return { envelopes, unreachable, cause }
}

/**
 * `pairwiseFanout` for a send that must not vanish: when not one device could be
 * reached, the original failure is thrown.
 *
 * A message that reaches nobody has to surface, or it would be written down as
 * sent and quietly never arrive. The server's own error is rethrown rather than
 * replaced, because it is the one that says *why* — an empty prekey pool on the
 * other side, not a broken client here.
 */
export async function pairwiseFanoutOrThrow(
  account: Account,
  recipientAccountId: string,
  devices: PeerDevice[],
  payloadHex: string,
  envelopeType: number,
  conversationId: string | null,
): Promise<Envelope[]> {
  const { envelopes, unreachable, cause } = await pairwiseFanout(
    account,
    recipientAccountId,
    devices,
    payloadHex,
    envelopeType,
    conversationId,
  )

  if (envelopes.length === 0 && unreachable.length > 0) {
    throw cause
  }
  return envelopes
}
