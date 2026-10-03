import * as wasm from './pkg/friendshub_wasm.js'
import { call } from './runtime'

/**
 * Group crypto (Signal sender keys). One group message is encrypted once and
 * the same ciphertext is fanned out to every member — unlike pairwise
 * encryption, the sender does not re-encrypt per recipient.
 */

/**
 * Creates (or returns) this device's sender key for a conversation and returns
 * the distribution message as hex. Send it to every member as
 * `ENVELOPE_TYPE_SENDER_KEY` before the first `groupEncrypt`.
 */
export function createSenderKeyDistribution(
  accountId: string,
  localDeviceNumber: number,
  conversationId: string,
): Promise<string> {
  return call('create_sender_key_distribution', () =>
    wasm.create_sender_key_distribution(accountId, localDeviceNumber, conversationId),
  )
}

/** Stores a member's sender key received as `ENVELOPE_TYPE_SENDER_KEY`. */
export function processSenderKeyDistribution(
  accountId: string,
  senderAccountId: string,
  senderDeviceNumber: number,
  skdmHex: string,
): Promise<void> {
  return call('process_sender_key_distribution', () => {
    wasm.process_sender_key_distribution(accountId, senderAccountId, senderDeviceNumber, skdmHex)
  })
}

/** Encrypts once for the whole group; returns the sender key message as hex. */
export function groupEncrypt(
  accountId: string,
  localDeviceNumber: number,
  conversationId: string,
  plaintextHex: string,
): Promise<string> {
  return call('group_encrypt', () =>
    wasm.group_encrypt(accountId, localDeviceNumber, conversationId, plaintextHex),
  )
}

/** Decrypts a group message (an `ENVELOPE_TYPE_MESSAGE` whose ciphertext is not
 *  a pairwise SignalMessage). Returns hex-encoded plaintext. */
export function groupDecrypt(
  accountId: string,
  senderAccountId: string,
  senderDeviceNumber: number,
  skmHex: string,
): Promise<string> {
  return call('group_decrypt', () =>
    wasm.group_decrypt(accountId, senderAccountId, senderDeviceNumber, skmHex),
  )
}
