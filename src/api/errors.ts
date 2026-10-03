/**
 * Every failure of an API call — HTTP status, transport failure or timeout —
 * surfaces as `ApiError`, so callers have one thing to catch.
 */

export type ApiErrorOptions = {
  /** HTTP status; `0` means the request never got a response. */
  status: number
  /** The server's `error` code, or a client-side code like `timeout`. */
  code: string
  message: string
  /** The server's `details` object, verbatim (snake_case, untyped). */
  details: unknown
  cause?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(options: ApiErrorOptions) {
    super(options.message, { cause: options.cause })
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
    this.details = options.details
  }

  /** True when the request never reached a responding server. */
  get isTransportFailure(): boolean {
    return this.status === 0
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Reads the documented error body — `{ error, message, details }` — falling back
 * to the status line when the response is not JSON (a proxy or gateway error
 * page, for instance).
 */
export async function toApiError(response: Response): Promise<ApiError> {
  const text = await response.text()

  let code = 'http_error'
  let message = response.statusText.length > 0 ? response.statusText : `HTTP ${response.status}`
  let details: unknown = null

  if (text.length > 0) {
    try {
      const parsed: unknown = JSON.parse(text)
      if (isRecord(parsed)) {
        if (typeof parsed['error'] === 'string') {
          code = parsed['error']
        }
        if (typeof parsed['message'] === 'string') {
          message = parsed['message']
        }
        if (parsed['details'] !== undefined) {
          details = parsed['details']
        }
      }
    } catch {
      // Not JSON: keep the status text, but keep the body as the detail so the
      // caller can still see what the server said.
      details = text.slice(0, 500)
    }
  }

  return new ApiError({ status: response.status, code, message, details })
}
