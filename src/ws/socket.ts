import { decodeServerFrame } from './envelope'
import { fh } from './proto/friendshub.js'

/**
 * The socket-level plumbing: opening, decoding binary frames, and closing.
 *
 * Separated from `WsClient` so the connection's state machine stays readable —
 * this module knows nothing about accounts, retries or events.
 */

export type SocketHandlers = {
  /** The connection is up; the handshake has not been sent yet. */
  onOpen: () => void
  /** A decoded frame. Decoding failures are logged here and dropped. */
  onFrame: (frame: fh.ServerFrame) => void
  onClose: (code: number, reason: string) => void
}

/** Close gracefully, but never wait longer than the given budget. */
const CLOSE_TIMEOUT_MS = 2_000

export function openSocket(url: string, handlers: SocketHandlers): WebSocket {
  const socket = new WebSocket(url)
  // Without this the browser (and Node) hand over a Blob, which cannot be
  // decoded synchronously.
  socket.binaryType = 'arraybuffer'

  socket.addEventListener('open', handlers.onOpen)

  socket.addEventListener('message', (event) => {
    if (!(event.data instanceof ArrayBuffer)) {
      console.warn('[ws] ignoring a frame that is not binary data')
      return
    }
    try {
      handlers.onFrame(decodeServerFrame(new Uint8Array(event.data)))
    } catch (error) {
      console.error('[ws] undecodable frame', error)
    }
  })

  socket.addEventListener('error', () => {
    // The browser gives no detail here; `close` always follows, and that is
    // where the connection state is decided.
    console.warn('[ws] socket error')
  })

  socket.addEventListener('close', (event) => {
    handlers.onClose(event.code, event.reason)
  })

  return socket
}

export function isSocketOpen(socket: WebSocket | null): socket is WebSocket {
  return socket !== null && socket.readyState === WebSocket.OPEN
}

/** Closes and resolves when the peer acknowledged, or when the budget runs out. */
export async function closeSocket(socket: WebSocket): Promise<void> {
  if (socket.readyState !== WebSocket.OPEN) {
    socket.close()
    return
  }

  await new Promise<void>((done) => {
    const timer = setTimeout(done, CLOSE_TIMEOUT_MS)
    socket.addEventListener(
      'close',
      () => {
        clearTimeout(timer)
        done()
      },
      { once: true },
    )
    socket.close()
  })
}
