import type { Envelope } from '../types'

/**
 * Events a `WsClient` emits. Separate from the client so the crypto and state
 * layers can type their handlers without importing the connection class (and
 * without a circular import).
 */

export type PresenceEvent = {
  accountId: string
  isOnline: boolean
  lastSeen: number | null
  customStatusText: string | null
  customStatusEmoji: string | null
  customStatusExpiresAt: number | null
}

export type BotMessageEvent = {
  messageId: string
  botId: string
  accountId: string
  text: string
  replyToMessageId: string | null
  createdAt: number
}

export type ChannelPostEvent = {
  postId: string
  channelId: string
  authorType: string
  authorId: string
  text: string
  attachmentIds: string[]
  replyToPostId: string | null
  createdAt: number
}

export type WsClientEvents = {
  /** Emitted on the first handshake and again after every reconnect. */
  connected: {
    sessionId: string
    accountId: string
    deviceNumber: number
    serverTimestamp: number
  }
  disconnected: {
    reason: string
    /** False when the client is already scheduling a reconnect. */
    final: boolean
  }
  /** A non-fatal error frame from the server. */
  error: {
    code: string
    message: string
    fatal: boolean
  }
  /**
   * A fatal error frame: the server will close the connection and the client
   * stops reconnecting. The session has to be re-established from scratch.
   */
  fatal: {
    code: string
    message: string
  }
  delivery: {
    envelopes: Envelope[]
  }
  receipt: {
    envelopeIds: string[]
    /**
     * The server's stamp for each id, in the same order — every envelope of one
     * upload shares one value. It is what a read marker is compared against,
     * because the client's own clock may disagree with the server's.
     */
    serverTimestamps: number[]
  }
  presence: PresenceEvent
  botMessage: BotMessageEvent
  channelPost: ChannelPostEvent
}
