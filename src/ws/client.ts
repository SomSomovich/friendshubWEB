import type { Account, Envelope } from '../types'
import { readEnvVar } from '../utils/env'
import { dispatchFrame, type FrameHandlers } from './dispatch'
import { bytesToUuid, toPlainNumber } from './envelope'
import { TypedEmitter } from './emitter'
import { WsError } from './errors'
import type { WsClientEvents } from './events'
import { fh } from './proto/friendshub.js'
import { Reconnector } from './reconnect'
import { FrameSender } from './sender'
import { closeSocket, isSocketOpen, openSocket } from './socket'

/** Overridable with `VITE_WS_URL`; a relative value works behind the dev proxy. */
export const WS_URL = readEnvVar('VITE_WS_URL', 'wss://api-fh.somuch-system.ru/ws')

const CLIENT_NAME = 'friendshub-web'
const CLIENT_VERSION = '0.1.0'
/** The version the native client speaks (API_FRONTEND.txt §23). */
const PROTOCOL_MAJOR = 0
const PROTOCOL_MINOR = 1
const PROTOCOL_PATCH = 0

/**
 * The server's own budget for receiving the hello (API_FRONTEND.txt §23), so it
 * only starts once the socket is up.
 */
const HANDSHAKE_TIMEOUT_MS = 10_000
/** Covers TCP, TLS and the upgrade; on a slow link that is not instant. */
const CONNECT_TIMEOUT_MS = 30_000
const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 60_000]

type AccountAuth = Pick<Account, 'sessionToken' | 'deviceNumber'>

type PendingHandshake = {
  resolve: () => void
  reject: (error: unknown) => void
  timer: ReturnType<typeof setTimeout>
}

/**
 * One WebSocket connection, used by exactly one account.
 *
 * Carries the handshake, the keep-alive cycle, envelope uploads and
 * acknowledgements, and it is the only source of live events (delivery, receipts
 * and presence). Reconnection is automatic with the documented backoff, except
 * after a fatal error frame — the server has decided this device may not talk to
 * it, and retrying would only hammer it.
 */
export class WsClient extends TypedEmitter<WsClientEvents> {
  private socket: WebSocket | null = null
  private account: AccountAuth | null = null
  private connected = false
  private closedByCaller = false
  private fatal = false
  private pendingHandshake: PendingHandshake | null = null
  private readonly sender = new FrameSender(() => this.socket)
  private readonly reconnector = new Reconnector({
    delaysMs: RECONNECT_DELAYS_MS,
    connect: () => this.openSocket(),
    shouldRetry: () => !this.closedByCaller && !this.fatal,
  })

  get isConnected(): boolean {
    return this.connected && isSocketOpen(this.socket)
  }

  /** Resolves once the server answered the handshake. */
  async connect(account: AccountAuth): Promise<void> {
    this.account = account
    this.closedByCaller = false
    this.fatal = false
    this.reconnector.reset()

    try {
      await this.openSocket()
    } catch (error) {
      this.reconnector.cancel()
      this.discardSocket()
      throw error
    }
  }

  /** Closes the connection and stops reconnecting. */
  async close(): Promise<void> {
    // Set before closing so `handleClose` recognises this as a deliberate stop:
    // it emits `disconnected` with `final: true` and skips the reconnect. The
    // socket reference is deliberately left in place until then — clearing it
    // first would make the close handler treat the event as stale.
    this.closedByCaller = true
    this.reconnector.cancel()
    this.sender.reset()
    this.rejectPendingHandshake(new WsError('the client was closed', { code: 'closed' }))

    const socket = this.socket
    if (socket === null) {
      return
    }

    await closeSocket(socket)

    // The close event never arrived (the budget in `closeSocket` ran out): make
    // sure nothing still points at a dead socket.
    if (this.socket === socket) {
      this.socket = null
      this.connected = false
    }
  }

  uploadEnvelopes(envelopes: Envelope[]): Promise<void> {
    return this.sender.uploadEnvelopes(envelopes)
  }

  ackEnvelopes(envelopeIds: string[]): Promise<void> {
    return this.sender.ackEnvelopes(envelopeIds)
  }

  /** See `FrameSender.sendTyping`. Throws when the socket is not open. */
  sendTyping(conversationId: string): void {
    this.sender.sendTyping(conversationId)
  }

  /** Round-trip time in milliseconds, measured by an echoed ping. */
  ping(timeoutMs?: number): Promise<number> {
    return this.sender.ping(timeoutMs)
  }

  // -------------------------------------------------------------------------
  // Connection lifecycle
  // -------------------------------------------------------------------------

  private openSocket(): Promise<void> {
    const account = this.account
    if (account === null) {
      return Promise.reject(
        new WsError('connect() must be called with an account first', { code: 'not_connected' }),
      )
    }

    return new Promise<void>((resolve, reject) => {
      const socket = openSocket(WS_URL, {
        onOpen: () => {
          // The socket is up, so the server's ten seconds start now — counting
          // them from before the TLS handshake would time out a slow connection
          // that is working perfectly well.
          this.armHandshakeTimeout(
            `no ServerHello within ${HANDSHAKE_TIMEOUT_MS} ms`,
            HANDSHAKE_TIMEOUT_MS,
          )
          try {
            this.sender.sendFrame({
              hello: {
                sessionToken: account.sessionToken,
                deviceNumber: account.deviceNumber,
                protocolMajor: PROTOCOL_MAJOR,
                protocolMinor: PROTOCOL_MINOR,
                protocolPatch: PROTOCOL_PATCH,
                clientName: CLIENT_NAME,
                clientVersion: CLIENT_VERSION,
              },
            })
          } catch (error) {
            this.rejectPendingHandshake(error)
            this.discardSocket()
          }
        },
        onFrame: (frame) => {
          dispatchFrame(frame, this.handlers)
        },
        onClose: (code, reason) => {
          this.handleClose(socket, code, reason)
        },
      })

      this.socket = socket
      this.pendingHandshake = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.failHandshake(`the socket did not open within ${CONNECT_TIMEOUT_MS} ms`)
        }, CONNECT_TIMEOUT_MS),
      }
    })
  }

  private completeHandshake(hello: fh.ServerHello): void {
    const pending = this.pendingHandshake
    if (pending === null) {
      return
    }
    this.pendingHandshake = null
    clearTimeout(pending.timer)

    this.connected = true
    this.reconnector.reset()
    this.sender.startKeepAlive()

    this.emit('connected', {
      sessionId: hello.sessionId,
      // A hello without an account id is a protocol violation; surfacing the
      // empty string is better than hiding it behind a thrown error here.
      accountId: hello.accountId.length === 0 ? '' : bytesToUuid(hello.accountId),
      deviceNumber: hello.deviceNumber,
      serverTimestamp: toPlainNumber(hello.serverTimestamp),
    })
    pending.resolve()
  }

  private handleClose(socket: WebSocket, code: number, reason: string): void {
    if (socket !== this.socket) {
      // A late event from a socket that was already replaced.
      return
    }

    const wasConnected = this.connected
    this.connected = false
    this.socket = null
    this.sender.reset()
    this.rejectPendingHandshake(new WsError(`the socket closed (${code})`, { code: 'closed' }))

    const stopping = this.closedByCaller || this.fatal
    if (wasConnected) {
      this.emit('disconnected', {
        reason: reason.length > 0 ? reason : `code ${code}`,
        final: stopping,
      })
    }

    if (!stopping && wasConnected) {
      this.reconnector.schedule()
    }
  }

  /** Replaces the pending handshake deadline with a new one. */
  private armHandshakeTimeout(message: string, timeoutMs: number): void {
    const pending = this.pendingHandshake
    if (pending === null) {
      return
    }
    clearTimeout(pending.timer)
    pending.timer = setTimeout(() => {
      this.failHandshake(message)
    }, timeoutMs)
  }

  private failHandshake(message: string): void {
    this.rejectPendingHandshake(new WsError(message, { code: 'handshake_timeout' }))
    this.discardSocket()
  }

  private rejectPendingHandshake(error: unknown): void {
    const pending = this.pendingHandshake
    if (pending === null) {
      return
    }
    this.pendingHandshake = null
    clearTimeout(pending.timer)
    pending.reject(error)
  }

  private discardSocket(): void {
    const socket = this.socket
    this.socket = null
    this.connected = false
    if (isSocketOpen(socket)) {
      socket.close()
    }
  }

  // -------------------------------------------------------------------------
  // Incoming frames
  // -------------------------------------------------------------------------

  private readonly handlers: FrameHandlers = {
    onHello: (hello) => {
      this.completeHandshake(hello)
    },
    onDelivery: (envelopes) => {
      if (envelopes.length > 0) {
        this.emit('delivery', { envelopes })
      }
    },
    onReceipt: (envelopeIds, serverTimestamps) => {
      this.emit('receipt', { envelopeIds, serverTimestamps })
    },
    onPong: (clientTimestamp) => {
      this.sender.resolvePong(clientTimestamp)
    },
    onPresence: (presence) => {
      this.emit('presence', presence)
    },
    onTyping: (typing) => {
      this.emit('typing', typing)
    },
    onBotMessage: (botMessage) => {
      this.emit('botMessage', botMessage)
    },
    onChannelPost: (channelPost) => {
      this.emit('channelPost', channelPost)
    },
    onError: (error) => {
      this.handleServerError(error)
    },
  }

  private handleServerError(error: fh.ErrorFrame): void {
    this.emit('error', { code: error.code, message: error.message, fatal: error.fatal })

    if (!error.fatal) {
      return
    }

    // The server closes the connection after a fatal error; stopping here keeps
    // the client from reconnecting to an endpoint that just refused it.
    this.fatal = true
    this.emit('fatal', { code: error.code, message: error.message })
    this.sender.reset()
    this.reconnector.cancel()
    this.rejectPendingHandshake(new WsError(`${error.code}: ${error.message}`, { code: 'fatal' }))
    this.discardSocket()
  }
}
