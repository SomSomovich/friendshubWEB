/**
 * Backoff scheduler for reconnects: 1, 2, 4, 8, 16, 32 then 60 seconds, with the
 * delay staying at the cap for every further attempt. One small unit, so the
 * policy is readable and the client does not have to carry it.
 */
export type ReconnectorOptions = {
  delaysMs: readonly number[]
  /** One reconnect attempt. Rejecting schedules the next one. */
  connect: () => Promise<void>
  /** False when the client has stopped for good (closed by the caller, or fatal). */
  shouldRetry: () => boolean
}

const DEFAULT_CAP_MS = 60_000

export class Reconnector {
  private readonly delaysMs: readonly number[]
  private readonly connect: () => Promise<void>
  private readonly shouldRetry: () => boolean
  private timer: ReturnType<typeof setTimeout> | null = null
  private attempt = 0

  constructor(options: ReconnectorOptions) {
    this.delaysMs = options.delaysMs
    this.connect = options.connect
    this.shouldRetry = options.shouldRetry
  }

  /** Schedules the next attempt; a no-op while one is already pending. */
  schedule(): void {
    if (this.timer !== null) {
      return
    }
    const delayMs = this.delaysMs[Math.min(this.attempt, this.delaysMs.length - 1)] ?? DEFAULT_CAP_MS
    this.attempt += 1

    this.timer = setTimeout(() => {
      this.timer = null
      void this.connect().catch((error: unknown) => {
        console.warn('[ws] reconnect attempt failed', error)
        if (this.shouldRetry()) {
          this.schedule()
        }
      })
    }, delayMs)
  }

  /** Called after a handshake succeeds, so the next drop starts from 1 s again. */
  reset(): void {
    this.attempt = 0
  }

  cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}
