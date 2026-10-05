/**
 * Delivery state of an own message. Incoming messages are stored as `sent`,
 * which is what they are by definition once they arrive.
 *
 * `delivered` is currently unreachable: the server acknowledges an upload with a
 * receipt, and a read marker travels back, but nothing reports that a peer's
 * device has actually taken delivery. The value stays in the type because the
 * chat list renders it, and inventing a source for it would be worse than an
 * honest gap.
 */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

/**
 * Reactions are cached per message so the UI can render them without a round
 * trip; the authoritative copy arrives as an `ENVELOPE_TYPE_REACTION`.
 */
export type Reaction = {
  actorId: string
  emoji: string
  createdAt: number
}

/** What a reply points at. The excerpt is carried so no lookup is needed. */
export type ReplyRef = {
  messageId: string
  preview: string | null
  senderAccountId: string | null
}

/** Where a forwarded message came from. */
export type ForwardRef = {
  originalMessageId: string
  originalConversationId: string
  originalSenderAccountId: string
  originalSenderDisplay: string | null
  originalCreatedAt: number
}

export type Message = {
  /**
   * The logical message: one per thing the user wrote, identical in every copy
   * sent to every device. Everything local — a reply, an edit, a delete, a
   * reaction — addresses a message by this, never by an envelope.
   */
  messageId: string
  /**
   * This device's copy of it. One envelope per recipient device, so an envelope
   * id identifies a delivery rather than a message; the store is keyed by it
   * because that is what the server acknowledges.
   */
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
  /**
   * The server's stamp, from the upload receipt — the only value read receipts
   * may be compared against. Falls back to `clientTimestamp` until the receipt
   * lands, which is why a tick can briefly under-report and never over-report.
   */
  serverTimestamp: number
  /** `attachment_id`s carried by the message. */
  attachments: string[]
  replyTo: ReplyRef | null
  forwardFrom: ForwardRef | null
  /** Unix seconds of the last edit; `null` when the message was never edited. */
  editedAt?: number | null
  /** Local only — pinning state, refreshed from the server. */
  isPinned: boolean
  reactions: Reaction[]
  status: MessageStatus
}
