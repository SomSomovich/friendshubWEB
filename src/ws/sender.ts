import type { Envelope } from '../types'
import { asBinaryPayload } from '../utils/bytes'
import { nowSeconds } from '../utils/time'
import { encodeClientFrame, toProtoEnvelopes, uuidToBytes } from './envelope'
import { WsError } from './errors'
import { fh } from './proto/friendshub.js'
import { isSocketOpen } from './socket'

/** The server accepts up to 128 envelopes per frame and drops flooders. */
const MAX_ENVELOPES_PER_FRAME = 128
/** Well under the server's 256 KiB write-buffer limit. */
const MAX_BUFFERED_BYTES = 64 * 1024
const KEEP_ALIVE_INTERVAL_MS = 30_000
const PING_TIMEOUT_MS = 5_000

/**
 * Everything that writes to the socket: frames, envelope batches, acknowledgements
 * and the keep-alive ping.
 *
 * Separated from the connection lifecycle because the two have nothing to say to
 * each other: this class only needs "give me the current socket" and never
 * reconnects, while the client never encodes a frame.
 */
export class FrameSender {
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null
  /** Keyed by the `client_timestamp` sent, so an echo can be matched exactly. */
  private readonly pendingPings = new Map<number, () => void>()
  private readonly getSocket: () => WebSocket | null

  constructor(getSocket: () => WebSocket | null) {
    this.getSocket = getSocket
  }

  /** Encodes and writes one client frame. */
  sendFrame(frame: fh.ClientFrame.$Properties): void {
    const socket = this.getSocket()
    if (!isSocketOpen(socket)) {
      throw new WsError('the socket is not open', { code: 'not_connected' })
    }
    socket.send(asBinaryPayload(encodeClientFrame(frame)))
  }

  /** Uploads envelopes, chunked to the documented frame limit. */
  async uploadEnvelopes(envelopes: Envelope[]): Promise<void> {
    for (let index = 0; index < envelopes.length; index += MAX_ENVELOPES_PER_FRAME) {
      const batch = envelopes.slice(index, index + MAX_ENVELOPES_PER_FRAME)
      await this.waitForDrain()
      this.sendFrame({ upload: { envelopes: toProtoEnvelopes(batch) } })
    }
  }

  /** Acknowledges delivered envelopes so the server stops replaying them. */
  async ackEnvelopes(envelopeIds: string[]): Promise<void> {
    for (let index = 0; index < envelopeIds.length; index += MAX_ENVELOPES_PER_FRAME) {
      const batch = envelopeIds.slice(index, index + MAX_ENVELOPES_PER_FRAME)
      await this.waitForDrain()
      this.sendFrame({ ack: { envelopeIds: batch.map((id) => uuidToBytes(id)) } })
    }
  }

  /**
   * Sends a ping and resolves with the round-trip time in milliseconds.
   *
   * The pong is matched on the echoed `client_timestamp`, so a pong from the
   * background keep-alive cycle cannot be mistaken for this one.
   */
  async ping(timeoutMs = PING_TIMEOUT_MS): Promise<number> {
    const clientTimestamp = nowSeconds()
    const sentAtMs = Date.now()

    return new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingPings.delete(clientTimestamp)
        reject(new WsError(`no Pong within ${timeoutMs} ms`, { code: 'ping_timeout' }))
      }, timeoutMs)

      this.pendingPings.set(clientTimestamp, () => {
        clearTimeout(timer)
        resolve(Date.now() - sentAtMs)
      })

      try {
        this.sendFrame({ ping: { clientTimestamp } })
      } catch (error) {
        clearTimeout(timer)
        this.pendingPings.delete(clientTimestamp)
        reject(error)
      }
    })
  }

  /** Called for every incoming `Pong`; resolves the ping that asked for it. */
  resolvePong(clientTimestamp: number): void {
    const resolve = this.pendingPings.get(clientTimestamp)
    if (resolve) {
      this.pendingPings.delete(clientTimestamp)
      resolve()
    }
  }

  /**
   * Keeps the connection alive with a ping every 30 s — an idle WebSocket is
   * closed by most intermediaries, and the pong is what proves the tunnel.
   */
  startKeepAlive(): void {
    this.stopKeepAlive()
    this.keepAliveTimer = setInterval(() => {
      try {
        this.sendFrame({ ping: { clientTimestamp: nowSeconds() } })
      } catch {
        // The socket is gone; the close handler owns what happens next.
      }
    }, KEEP_ALIVE_INTERVAL_MS)
  }

  stopKeepAlive(): void {
    if (this.keepAliveTimer !== null) {
      clearInterval(this.keepAliveTimer)
      this.keepAliveTimer = null
    }
  }

  /** Drops per-socket state, so a reconnect cannot resolve a stale ping. */
  reset(): void {
    this.stopKeepAlive()
    this.pendingPings.clear()
  }

  /** Waits for the socket to drain: the server drops clients that flood it. */
  private async waitForDrain(): Promise<void> {
    for (;;) {
      const socket = this.getSocket()
      if (!isSocketOpen(socket)) {
        throw new WsError('the socket closed while sending', { code: 'closed' })
      }
      if (socket.bufferedAmount <= MAX_BUFFERED_BYTES) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }
}
