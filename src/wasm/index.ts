import * as wasm from './pkg/friendshub_wasm.js'
import { mapEncryptResult, mapGeneratedPrekeys, mapIdentityChanges, mapPrekeyCounts } from './parse'
import { assertPrekeyCount, assertRegistrationId, call, parseWith } from './runtime'
import type {
  EncryptResult,
  GeneratedPrekeys,
  IdentityChange,
  IdentityPair,
  PrekeyCounts,
} from './types'

/**
 * Typed facade over the WASM crypto module. Every function is async even though
 * the module is synchronous: the UI and orchestration layers should not depend
 * on that implementation detail.
 *
 * Nothing cryptographic is implemented here — the module owns all key material
 * and session state (see WASM_API.txt).
 */

export { WasmError } from './errors'
export type { WasmErrorCode } from './errors'
export { initWasm } from './runtime'
export type { WasmInitInput } from './runtime'
export * from './groups'
export * from './attachments'
export type {
  AttachmentKey,
  EncryptResult,
  GeneratedPrekeys,
  IdentityChange,
  IdentityPair,
  PrekeyCounts,
  PrekeyRef,
} from './types'

// =============================================================================
// Lifecycle
// =============================================================================

/** Smoke test: proves the module is instantiated and callable. */
export function ping(): Promise<string> {
  return call('ping', () => wasm.ping())
}

/**
 * Creates the account's identity key pair and keeps it in module state.
 *
 * The public half is read back through `local_identity_public` rather than
 * sliced off the returned blob: the blob is the module's own serialization
 * format, and splitting it by assumption is what the known `snapshot`/`restore`
 * mismatch (69 bytes produced, 65 expected) makes unsafe.
 */
export function generateIdentity(
  accountId: string,
  registrationId: number,
): Promise<IdentityPair> {
  return call('generate_identity', () => {
    assertRegistrationId(registrationId, 'generate_identity')
    const keyPairHex = wasm.generate_identity(accountId, registrationId)
    return { publicKeyHex: wasm.local_identity_public(accountId), keyPairHex }
  })
}

/** Loads a key pair previously produced by `generate_identity` or `snapshot`. */
export function loadIdentity(
  accountId: string,
  keyPairHex: string,
  registrationId: number,
): Promise<void> {
  return call('load_identity', () => {
    assertRegistrationId(registrationId, 'load_identity')
    wasm.load_identity(accountId, keyPairHex, registrationId)
  })
}

/** The 33-byte public identity key in hex — the value `POST /devices` takes. */
export function localIdentityPublic(accountId: string): Promise<string> {
  return call('local_identity_public', () => wasm.local_identity_public(accountId))
}

/**
 * Serializes all state for one account to JSON. The caller persists it; the
 * module never touches storage.
 */
export function snapshot(accountId: string): Promise<string> {
  return call('snapshot', () => wasm.snapshot(accountId))
}

export function restore(accountId: string, snapshotJson: string): Promise<void> {
  return call('restore', () => {
    wasm.restore(accountId, snapshotJson)
  })
}

/** Wipes the account's state. Call on logout. */
export function reset(accountId: string): Promise<void> {
  return call('reset', () => {
    wasm.reset(accountId)
  })
}

// =============================================================================
// Prekeys
// =============================================================================

/**
 * Generates one-time prekeys plus a signed prekey and the Kyber last-resort
 * key. Send the result to `POST /devices/me/prekeys` unchanged.
 */
export function generatePrekeys(accountId: string, count: number): Promise<GeneratedPrekeys> {
  return call('generate_prekeys', () => {
    assertPrekeyCount(count)
    return parseWith(
      'generate_prekeys',
      wasm.generate_prekeys(accountId, count),
      mapGeneratedPrekeys,
    )
  })
}

/** Local pool sizes; the server keeps its own counts (see
 *  `GET /devices/me/prekeys/status`) and both are needed to decide on a refill. */
export function prekeyCounts(accountId: string): Promise<PrekeyCounts> {
  return call('prekey_counts', () =>
    parseWith('prekey_counts', wasm.prekey_counts(accountId), mapPrekeyCounts),
  )
}

// =============================================================================
// Pairwise sessions
// =============================================================================

/**
 * Establishes an outbound session with one device of a peer.
 *
 * `bundleJson` is the `GET /accounts/{id}/devices/{n}/bundle` response verbatim:
 * the module parses it itself, so the bridge never has to model its shape.
 */
export function establishSession(
  accountId: string,
  peerAccountId: string,
  peerDeviceNumber: number,
  localDeviceNumber: number,
  bundleJson: string,
): Promise<void> {
  return call('establish_session', () => {
    wasm.establish_session(accountId, peerAccountId, peerDeviceNumber, localDeviceNumber, bundleJson)
  })
}

/**
 * Encrypts for one device. `plaintextHex` is raw UTF-8 for `ENVELOPE_TYPE_MESSAGE`
 * (use `utf8ToHex`) and JSON for sync/edit/reaction payloads.
 */
export function encrypt(
  accountId: string,
  peerAccountId: string,
  peerDeviceNumber: number,
  localDeviceNumber: number,
  plaintextHex: string,
): Promise<EncryptResult> {
  return call('encrypt', () =>
    parseWith(
      'encrypt',
      wasm.encrypt(accountId, peerAccountId, peerDeviceNumber, localDeviceNumber, plaintextHex),
      mapEncryptResult,
    ),
  )
}

/** Decrypts one incoming pairwise envelope. Returns hex-encoded plaintext. */
export function decrypt(
  accountId: string,
  senderAccountId: string,
  senderDeviceNumber: number,
  localDeviceNumber: number,
  ciphertextHex: string,
  isPrekeyMessage: boolean,
): Promise<string> {
  return call('decrypt', () =>
    wasm.decrypt(
      accountId,
      senderAccountId,
      senderDeviceNumber,
      localDeviceNumber,
      ciphertextHex,
      isPrekeyMessage,
    ),
  )
}

// =============================================================================
// Identity changes (TOFU warnings)
// =============================================================================

/** Peer identity keys that changed. Non-empty means the user must be warned. */
export function identityChanges(accountId: string): Promise<IdentityChange[]> {
  return call('identity_changes', () =>
    parseWith('identity_changes', wasm.identity_changes(accountId), mapIdentityChanges),
  )
}

/** Clears the log once the user has acknowledged it. */
export function clearIdentityChanges(accountId: string): Promise<void> {
  return call('clear_identity_changes', () => {
    wasm.clear_identity_changes(accountId)
  })
}
