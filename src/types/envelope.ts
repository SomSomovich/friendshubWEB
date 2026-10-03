/**
 * One encrypted envelope, as the app sees it: identifiers are UUID strings and
 * the ciphertext is hex, while the wire form (protobuf) carries raw bytes. The
 * conversion between the two lives in `src/ws/envelope.ts`.
 *
 * Not part of the subphase 2.2 type list, but the send and receive paths need a
 * named shape for "an envelope we built" and "an envelope that arrived", and
 * spelling it out at each call site would be worse.
 */
export type Envelope = {
  envelopeId: string
  senderAccountId: string
  senderDeviceNumber: number
  recipientAccountId: string
  recipientDeviceNumber: number
  /** An `ENVELOPE_TYPE_*` value; see `src/ws/envelopeTypes.ts`. */
  envelopeType: number
  isPrekeyMessage: boolean
  /** Hex-encoded ciphertext, exactly as the WASM module produced it. */
  ciphertext: string
  clientTimestamp: number
  /** `null` for envelopes that belong to no conversation. */
  conversationId: string | null
  senderIsBot: boolean
}
