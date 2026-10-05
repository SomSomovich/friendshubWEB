import {
  bytesToUuid,
  fromProtoEnvelopesLenient,
  toBotMessageEvent,
  toChannelPostEvent,
  toPlainNumber,
  toPresenceEvent,
  toReadReceiptEvent,
  toTypingEvent,
} from './envelope'
import type {
  BotMessageEvent,
  ChannelPostEvent,
  PresenceEvent,
  ReadReceiptEvent,
  TypingEvent,
} from './events'
import { fh } from './proto/friendshub.js'

/** What the client does with each kind of frame that arrives. */
export type FrameHandlers = {
  onHello(hello: fh.ServerHello): void
  onDelivery(envelopes: ReturnType<typeof fromProtoEnvelopesLenient>): void
  onReceipt(envelopeIds: string[], serverTimestamps: number[]): void
  onPong(clientTimestamp: number): void
  onPresence(event: PresenceEvent): void
  onTyping(event: TypingEvent): void
  onReadReceipt(event: ReadReceiptEvent): void
  onBotMessage(event: BotMessageEvent): void
  onChannelPost(event: ChannelPostEvent): void
  onError(error: fh.ErrorFrame): void
}

/**
 * Routes one decoded server frame to the matching handler.
 *
 * `decode()` returns fully populated class instances, but the generated types
 * describe oneof members as their `$Properties` shapes, where every field is
 * optional. The casts here assert what decoding already guarantees, in one place
 * rather than at every use site.
 */
export function dispatchFrame(frame: fh.ServerFrame, handlers: FrameHandlers): void {
  switch (frame.kind) {
    case 'hello':
      if (frame.hello) {
        handlers.onHello(frame.hello as fh.ServerHello)
      }
      return

    case 'delivery':
      handlers.onDelivery(
        fromProtoEnvelopesLenient((frame.delivery?.envelopes ?? []) as fh.Envelope[]),
      )
      return

    case 'receipt':
      handlers.onReceipt(
        (frame.receipt?.envelopeIds ?? []).map((id: Uint8Array) => bytesToUuid(id)),
        // Parallel to the ids and filled only by the server. A missing or
        // mismatched list yields zeros rather than throwing: the ack itself is
        // still worth having, and a timestamp of 0 simply never marks anything
        // read.
        (frame.receipt?.serverTimestamps ?? []).map((stamp) => toPlainNumber(stamp)),
      )
      return

    case 'pong':
      if (frame.pong) {
        handlers.onPong(toPlainNumber(frame.pong.clientTimestamp))
      }
      return

    case 'presence':
      if (frame.presence) {
        handlers.onPresence(toPresenceEvent(frame.presence as fh.PresenceUpdate))
      }
      return

    case 'botMessage':
      if (frame.botMessage) {
        handlers.onBotMessage(toBotMessageEvent(frame.botMessage as fh.BotMessageDelivery))
      }
      return

    case 'channelPost':
      if (frame.channelPost) {
        handlers.onChannelPost(toChannelPostEvent(frame.channelPost as fh.ChannelPostDelivery))
      }
      return

    case 'error':
      if (frame.error) {
        handlers.onError(frame.error as fh.ErrorFrame)
      }
      return

    case 'typing':
      if (frame.typing) {
        handlers.onTyping(toTypingEvent(frame.typing as fh.TypingDelivery))
      }
      return

    case 'readReceipt':
      if (frame.readReceipt) {
        handlers.onReadReceipt(toReadReceiptEvent(frame.readReceipt as fh.ReadReceiptDelivery))
      }
      return

    default:
      console.warn(`[ws] unhandled frame kind: ${String(frame.kind)}`)
  }
}
