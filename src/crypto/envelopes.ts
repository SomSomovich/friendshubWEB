import { getPeerBundle, listPeerDevices, type PeerDevice } from '../api/devices'
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
