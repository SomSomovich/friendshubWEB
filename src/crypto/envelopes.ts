import { getPeerBundle, listPeerDevices, type PeerDevice } from '../api/devices'
import { getCachedDevices, putCachedDevices } from '../storage/devices_cache'
import type { Account, Envelope } from '../types'
import { nowSeconds } from '../utils/time'
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
    // UUIDv4: the API only needs 16 unique bytes, and ordering comes from the
    // timestamps, so nothing here depends on a v7 layout.
    envelopeId: input.envelopeId ?? crypto.randomUUID(),
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

// ---------------------------------------------------------------------------
// Payloads
//
// What the ciphertext of a non-message envelope decrypts to. The names are the
// wire names — snake_case — because the native clients produce and consume them
// (WASM_API.txt §5-6, and `friendshub-core/src/api/attachments.rs::send_key`).
// ---------------------------------------------------------------------------

/** A copy of an own message, for this account's other devices. */
export type SyncSentPayload = {
  kind: 'sync_sent'
  to_account: string
  to_devices: number[]
  conversation_id: string
  plaintext_hex: string
  envelope_ids: string[]
}

export type EditPayload = {
  kind: 'edit'
  target_envelope_id: string
  new_plaintext_hex: string
}

export type DeletePayload = {
  kind: 'delete'
  target_envelope_id: string
}

/**
 * One reaction change.
 *
 * The docs only say reactions carry "a JSON payload like an edit", so the field
 * names here are this client's own; a native client would have to agree on them
 * before the two can interoperate on reactions.
 */
export type ReactionPayload = {
  kind: 'reaction'
  target_envelope_id: string
  emoji: string
  remove: boolean
}

export type AttachmentKeyPayload = {
  kind: 'attachment_key'
  attachment_id: string
  key_hex: string
  base_nonce_hex: string
  conversation_id: string | null
}

/**
 * WebRTC signalling. `kind` here is the call event, not the envelope type — the
 * envelope type already says which of the five call frames this is.
 */
export type CallPayload = {
  call_id: string
  kind: 'offer' | 'answer' | 'ice' | 'hangup' | 'reject'
  sdp: string | null
  candidate: unknown
  reason: string | null
}

/** True when a decrypted JSON payload looks like one of the shapes above. */
export function isRecordWithKind(value: unknown, kind: string): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { kind?: unknown }).kind === kind
  )
}
