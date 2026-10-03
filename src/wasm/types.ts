/**
 * Types for plain (non-JSON) values the module returns, and for the JSON
 * structures it returns as text. The raw JSON is snake_case; the bridge
 * normalises it to camelCase so the rest of the app never sees both styles.
 */

/** An identity key pair as the bridge exposes it. */
export type IdentityPair = {
  /**
   * 33-byte public identity key in hex — exactly what `POST /devices` expects.
   * Read from `local_identity_public` rather than sliced out of `keyPairHex`:
   * the module's serialized blob layout is not a documented raw concatenation.
   */
  publicKeyHex: string
  /**
   * The module's own serialized key pair, verbatim. Persisted as part of
   * `snapshot()` and accepted by `load_identity`.
   */
  keyPairHex: string
}

/** One prekey reference, as returned by `generate_prekeys`. */
export type PrekeyRef = {
  id: number
  pub: string
  /** Present for signed prekeys and the Kyber last-resort key only. */
  sig?: string
}

/** Result of `generate_prekeys`; send as-is to `POST /devices/me/prekeys`. */
export type GeneratedPrekeys = {
  signedPrekey: PrekeyRef
  kyberLastResort: PrekeyRef
  oneTimePrekeys: PrekeyRef[]
  kyberOneTimePrekeys: PrekeyRef[]
}

/** Result of `prekey_counts`. */
export type PrekeyCounts = {
  oneTimeAvailable: number
  kyberOneTimeAvailable: number
  hasSignedPrekey: boolean
  hasKyberLastResort: boolean
}

/** Result of `encrypt`, mapped onto `Envelope` fields. */
export type EncryptResult = {
  ciphertextHex: string
  isPrekeyMessage: boolean
}

/** Result of `generate_attachment_key`. */
export type AttachmentKey = {
  keyHex: string
  baseNonceHex: string
}

/**
 * One entry of `identity_changes`: a peer's identity key was replaced, which is
 * either a re-installation or a man-in-the-middle attempt and must be shown.
 */
export type IdentityChange = {
  accountId: string
  deviceNumber: number
  oldKeyHex: string
  newKeyHex: string
  changedAt: number
}
