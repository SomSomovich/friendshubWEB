/**
 * Delivery state of an own message. Incoming messages are stored as `sent`,
 * which is what they are by definition once they arrive.
 */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

/**
 * Reactions are cached per message so the UI can render them without a round
 * trip; the authoritative copy arrives as `ENVELOPE_TYPE_REACTION`.
 */
export type Reaction = {
  actorId: string
  emoji: string
  createdAt: number
}

export type Message = {
  envelopeId: string
  conversationId: string
  senderAccountId: string
  senderDeviceNumber: number
  recipientAccountId: string
  recipientDeviceNumber: number
  /**
   * Raw `EnvelopeType` value. Kept as a number because the wire format may
   * carry types this build does not know yet (the constants live in
   * `src/ws/envelopeTypes.ts`).
   */
  envelopeType: number
  /** `null` until the envelope has been decrypted. */
  plaintext: string | null
  decryptedAt: number | null
  clientTimestamp: number
  serverTimestamp: number
  /** `attachment_id`s carried by the message. */
  attachments: string[]
  /** Local only: reply/forward are deferred past the MVP. */
  replyToEnvelopeId: string | null
  /**
   * Unix seconds of the last edit, or `null`/absent when the message was never
   * edited. Optional because rows written before this field existed only have
   * the other one to go on.
   */
  editedAt?: number | null
  /** Local only — pinning is never sent to the server. */
  isPinned: boolean
  reactions: Reaction[]
  status: MessageStatus
}
