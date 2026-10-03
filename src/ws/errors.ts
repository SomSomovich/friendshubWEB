/**
 * Failures of the WebSocket layer. Kept in one type, like `ApiError` on the HTTP
 * side, so callers branch on `code` instead of matching message text.
 */

export type WsErrorCode =
  /** Used before `connect()` succeeded, or after `close()`/a fatal error. */
  | 'not_connected'
  /** No `ServerHello` within the handshake deadline. */
  | 'handshake_timeout'
  /** The socket closed while a handshake or a send was in flight. */
  | 'closed'
  /** A ping got no matching pong within its deadline. */
  | 'ping_timeout'
  /** The server rejected the connection permanently (see the `fatal` event). */
  | 'fatal'

export type WsErrorOptions = {
  code: WsErrorCode
  cause?: unknown
}

export class WsError extends Error {
  readonly code: WsErrorCode

  constructor(message: string, options: WsErrorOptions) {
    super(message, { cause: options.cause })
    this.name = 'WsError'
    this.code = options.code
  }
}
